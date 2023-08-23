# Visual Studio Code - Starcoder extension <img src="./assets/icon.png" height="30">

This extension enables code suggestion and auto-completion using [Starcoder](https://huggingface.co/bigcode/starcoder) model.
It relies on Hugging Face Starcoder inference endpoint or on a private inference endpoint.

## Usage

1. Install the extension from release or from source
2. Setup your Hugging Face API key in the extension settings or private inference endpoint
3. Open a Python file and start coding!


## Private inference endpoint

Extension expects [Hugging Face TGI](https://github.com/huggingface/text-generation-inference) API for private endpoints.

## Development

### Get up and running straight away

* Install the recommended extensions (amodio.tsl-problem-matcher and dbaeumer.vscode-eslint)
* Press `F5` to open a new window with your extension loaded.
* Configure the extension to use your Hugging Face API key or private inference endpoint
* Open `src/extension.ts` and start coding, changes will be reflected in the running instance.
* Find output from your extension in the debug console.

### Bundle the extension

* Install `vsce` extension
* Run `vsce package --baseContentUrl=https://github.com/hugoch/vscode-starcoder --baseImagesUrl=https://github.com/hugoch/vscode-starcoder` to create a `.vsix` file

## Acknowledgements

Based on the awesome work of https://github.com/Venthe/vscode-fauxpilot

