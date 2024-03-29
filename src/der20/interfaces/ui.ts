import { Result } from "der20/interfaces/result";
import { ConfigurationValue, CollectionItem } from "der20/interfaces/config";

/**
 * Configuration items that can provide callbacks to build their UI implement this.
 */
export interface DialogAware {
    buildControls(dialog: Dialog, link: Dialog.Link): void;
}

export interface Dialog {
    beginControlGroup(): void;
    endControlGroup(): void;
    addEditControl<T>(label: string, path: string, config: ConfigurationValue<T>, link: Dialog.Link): void;
    addEditCommand(label: string, buttonLabel: string, path: string, link: Dialog.Link): void;
    addChoiceControlGroup(label: string, path: string, choices: CollectionItem[], link: Dialog.Link): void;
    addSelectionGroup(label: string, path: string, choices: { label: string; result: string }[], link: Dialog.Link): void;
    addCommand(label: string, path: string, link: Dialog.Link): void;
    addExternalLinkButton(label: string, target: string): void;
    addTitle(text: string): void;
    addSubTitle(text: string): void;
    addSeparator(): void;
    addTextLine(text: string): void;
    addIndentedTextLine(text: string): void;
    addLinkTextLine(text: string, target: string): void;
    addTableControl<T extends DialogAware & CollectionItem>(label: string, path: string, config: T[], link: Dialog.Link): void;
    getDateText(value: number): string;

    /**
     * returns the HTML for all previously added content
     */
    render(): string;

    /**
     * stand alone function does not add anything to dialog being constructed and just
     * returns HTML for echoing the specified command line
     */
    renderCommandEcho(line: string, resultType: Result.Kind): string;
}

// eslint-disable-next-line no-redeclare
export namespace Dialog {
    export interface Link {
        command: string;
        prefix?: string;
        suffix?: string;
        followUps?: string[];
    }
}

export interface DialogFactory {
    new (): Dialog;
}
