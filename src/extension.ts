// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, languages, StatusBarAlignment, window, workspace} from 'vscode';
import { turnOffStarCoder, turnOnStarCoder } from './cmds';
import { StarCoderCompletionProvider } from './StarCoderCompletionProvider';
import { EXTENSION_NAME } from './constants';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	console.debug("Registering Starcoder provider", new Date());

	const statusBar = window.createStatusBarItem(StatusBarAlignment.Right);
	statusBar.text = "$(star-full)";
	statusBar.tooltip = `Starcoder is ready`;

	const statusUpdateCallback = (callback: any, showIcon: boolean) => async () => {
		await callback();
		if (showIcon) {
			statusBar.show();
		} else {
			statusBar.hide();
		}
	};

	context.subscriptions.push(
		languages.registerInlineCompletionItemProvider(
			{ pattern: "**" }, new StarCoderCompletionProvider(statusBar)
		),

		commands.registerCommand(turnOnStarCoder.command, statusUpdateCallback(turnOnStarCoder.callback, true)),
		commands.registerCommand(turnOffStarCoder.command, statusUpdateCallback(turnOffStarCoder.callback, false)),
		statusBar
	);

	if (workspace.getConfiguration(EXTENSION_NAME).get("enabled")) {
		statusBar.show();
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.debug("Deactivating Starcoder extension", new Date());
}