import * as vscode from "vscode";

export class Item implements vscode.QuickPickItem {

    constructor(
        public label: string,
        public line: number,
        public rawText: string,
        public description: string = "",
        public detail: string = "",
    ) {
    }
}
