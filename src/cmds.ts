import { ConfigurationTarget, workspace } from "vscode";
import { EXTENSION_NAME } from "./constants";

const configuration = workspace.getConfiguration();
const target = ConfigurationTarget.Global;

function setExtensionStatus(enabled: boolean) {
    console.debug(`${EXTENSION_NAME} is now ${enabled}`);
    configuration.update(`${EXTENSION_NAME}.enabled`, enabled, target, false).then(console.info);
}

export type Command = { command: string, callback: (...args: any[]) => any, thisArg?: any };

export const turnOnStarCoder: Command = {
    command: `${EXTENSION_NAME}.enable`,
    callback: () => setExtensionStatus(true)
};

export const turnOffStarCoder: Command = {
    command: `${EXTENSION_NAME}.disable`,
    callback: () => setExtensionStatus(false)
};
