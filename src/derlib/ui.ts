import { ConfigurationStep } from "derlib/config/atoms";

export interface Dialog {
    beginControlGroup(): void;
    endControlGroup(): void;
    addEditControl<T>(label: string, path: string, config: ConfigurationStep<T>): void;
    addChoiceControl(label: string, path: string): void;
    addCommand(label: string, target: string): void;
    addExternalLinkButton(label: string, target: string): void;
    addTitle(label: string): void;
    addSubTitle(label: string): void;
    addSeparator(): void;
    render(): string;
}

export interface DialogFactory {
    new(commandPrefix: string): Dialog;
}