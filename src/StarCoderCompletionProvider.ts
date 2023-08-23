import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, Range, TextDocument, workspace, StatusBarItem } from 'vscode';
import axios, { AxiosResponse } from 'axios';
import { nextId } from './uuidV4';
import { EXTENSION_NAME } from './constants';

export class StarCoderCompletionProvider implements InlineCompletionItemProvider {
    cachedPrompts: Map<string, number> = new Map<string, number>();

    private requestStatus: string = "done";
    private statusBar: StatusBarItem;

    constructor(statusBar: StatusBarItem) {
        this.statusBar = statusBar;
    }

    public async provideInlineCompletionItems(document: TextDocument, position: Position, _context: InlineCompletionContext, _token: CancellationToken): Promise<InlineCompletionItem[] | InlineCompletionList | null | undefined> {
        if (!workspace.getConfiguration(EXTENSION_NAME).get("enabled")) {
            console.debug("Extension not enabled, skipping.");
            return Promise.resolve(([] as InlineCompletionItem[]));
        }

        let suggestionDelay = workspace.getConfiguration(EXTENSION_NAME).get("suggestionDelay") as number;
        const minSuggestionDelay = 100;
        if (suggestionDelay < minSuggestionDelay) {
            console.warn(`Suggestion delay of ${suggestionDelay}ms is too small. Setting to ${minSuggestionDelay}ms`);
        }

        const prompt = this.getPrompt(document, position);
        console.debug("Requesting completion for prompt", prompt, position);

        if (this.isNil(prompt)) {
            console.debug("Prompt is empty, skipping");
            return Promise.resolve(([] as InlineCompletionItem[]));
        }

        const currentTimestamp = Date.now();
        const currentId = nextId();
        this.cachedPrompts.set(currentId, currentTimestamp);

        // wait for inference request to finish. If we have newer requests (eg. user is typing), discard the completion by returning and empty one
        while (this.requestStatus === "pending" || currentTimestamp + suggestionDelay > Date.now()) {
            await this.sleep(suggestionDelay);
            console.debug("current id = ", currentId, " request status = ", this.requestStatus);
            if (this.newestTimestamp() > currentTimestamp) {
                console.debug("newest timestamp=", this.newestTimestamp(), "current timestamp=", currentTimestamp);
                console.debug("Newer request detected, discarding current completion");
                this.cachedPrompts.delete(currentId);
                return Promise.resolve(([] as InlineCompletionItem[]));
            }
        }

        console.debug("current id = ", currentId, "set request status to pending");
        this.requestStatus = "pending";
        this.statusBar.tooltip = "Starcoder - Working";
        this.statusBar.text = "$(star-half)";

        //return this.toInlineCompletions(response.data, position)
        return this.callInferenceEndpoint(prompt as String).then((response) => {
            this.statusBar.text = "$(star-full)";
            console.log(response);
            return this.toInlineCompletions(response.data[0], position);
        }).catch((error) => {
            console.error(error);
            this.statusBar.text = "$(alert)";
            return ([] as InlineCompletionItem[]);
        }).finally(() => {
            console.debug("current id = ", currentId, "set request status to done");
            this.requestStatus = "done";

        });
    }

    private getPrompt(document: TextDocument, position: Position): String | undefined {
        // try to select range before and after cursor
        const maxLines = workspace.getConfiguration(EXTENSION_NAME).get("maxLines") as number;
        const linesToSelect = Math.ceil(maxLines / 2);
        const firstLine = Math.max(position.line - linesToSelect, 0);
        const lastLine = position.line + linesToSelect;
        const prefix = document.getText(new Range(firstLine, 0, position.line, position.character));
        const suffix = document.getText(new Range(position.line, position.character + 1, lastLine, 0));
        return `<fim_prefix>${prefix}<fim_suffix>${suffix}<fim_middle>`;
        return document.getText(
            new Range(firstLine, 0, position.line, position.character)
        );
    }

    private isNil(value: String | undefined | null): boolean {
        return value === undefined || value === null || value.length === 0;
    }

    private newestTimestamp() {
        return Array.from(this.cachedPrompts.values()).reduce((a, b) => Math.max(a, b));
    }

    private sleep(milliseconds: number) {
        return new Promise(r => setTimeout(r, milliseconds));
    };

    private callInferenceEndpoint(prompt: String): Promise<AxiosResponse> {
        // check for private inference endpoint
        const endpoint = workspace.getConfiguration(EXTENSION_NAME).get("endpoint") as string;
        if (endpoint) {
            return this.callPrivateInferenceEndpoint(endpoint, prompt);
        } else {
            return this.callHuggingFaceInferenceEndpoint(prompt);
        }
    }

    private async callPrivateInferenceEndpoint(endpoint: string, prompt: String): Promise<AxiosResponse> {
        console.debug("Calling private endpoint");
        const response = await axios.post(
            endpoint,
            {
                inputs: prompt,
                parameters: this.buildInferenceParams()
            }
        );
        return response;
    }

    private async callHuggingFaceInferenceEndpoint(prompt: String): Promise<AxiosResponse> {
        console.debug("Calling HuggingFace endpoint");
        const token = workspace.getConfiguration(EXTENSION_NAME).get("huggingFaceToken");
        if (token === "") {
            throw new Error("You must configure a Hugging Face token");
        }
        const stopWords = workspace.getConfiguration(EXTENSION_NAME).get("inlineCompletion") ? ["\n"] : [];
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/bigcode/starcoder",
            {
                inputs: prompt,
                parameters: this.buildInferenceParams()
            },
            {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Authorization: `Bearer ${token}` //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
                }
            }
        );
        return response;
    }

    private toInlineCompletions(value: TextGenerationReponse, position: Position): InlineCompletionItem[] {
        const generatedText = value.generated_text.replace("<|endoftext|>", ""); // remove EOS token
        console.debug(`Returning inline completion :: ${generatedText}`);
        return [new InlineCompletionItem(generatedText, new Range(position, position))];
    }

    private buildInferenceParams(): InferenceParameters {
        const temperature = workspace.getConfiguration(EXTENSION_NAME).get("temperature");
        const maxNewTokens = workspace.getConfiguration(EXTENSION_NAME).get("maxTokens");
        return {
            temperature: temperature ? temperature as number : 0.1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            return_full_text: false,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            do_sample: true,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            max_new_tokens: maxNewTokens ? maxNewTokens as number : 200,
            stop: ["<|endoftext|>"]
        };
    }
}


interface TextGenerationReponse {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    generated_text: string
}

interface InferenceParameters {
    temperature: number
    // eslint-disable-next-line @typescript-eslint/naming-convention
    return_full_text: boolean
    // eslint-disable-next-line @typescript-eslint/naming-convention
    do_sample: boolean
    // eslint-disable-next-line @typescript-eslint/naming-convention
    max_new_tokens: number
    stop: Array<string>
}