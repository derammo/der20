import { ConfigurationStep, CollectionItem } from "derlib/config/atoms";

export interface Dialog {
    beginControlGroup(): void;
    endControlGroup(): void;
    addEditControl<T>(label: string, path: string, config: ConfigurationStep<T>): void;
    addChoiceControlGroup(label: string, prefix: string, choices: CollectionItem[], suffix: string): void;
    addCommand(label: string, target: string): void;
    addExternalLinkButton(label: string, target: string): void;
    addTitle(text: string): void;
    addSubTitle(text: string): void;
    addSeparator(): void;
    addTextLine(text: string): void;
    addIndentedTextLine(text: string): void;
    getDateText(value: number): string;
    render(): string;
}

export interface DialogFactory {
    new(commandPrefix: string): Dialog;
}