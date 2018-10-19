import { ConfigurationStep } from "./config";

export interface Dialog {
    beginControlGroup(): void;
    endControlGroup(): void;
    addEditControl(label: string, path: string, config: ConfigurationStep): void;
    addChoiceControl(label: string, path: string): void;
    addCommand(label: string, target: string): void;
    addExternalLinkButton(label: string, target: string): void;
    addTitle(label: string): void;
    addSubTitle(label: string): void;
    addSeparator(): void;
    render(): string;
}

export interface DialogFactory {
    new(command_prefix: string): Dialog;
}