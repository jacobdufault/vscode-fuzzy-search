import * as vscode from "vscode";
import { Item } from "./fuzzy_item";

const diagnosticIcons = {
    [vscode.DiagnosticSeverity.Error]: {
        label: "Error",
        icon: "error",
    },
    [vscode.DiagnosticSeverity.Warning]: {
        label: "Warning",
        icon: "warning",
    },
    [vscode.DiagnosticSeverity.Information]: {
        label: "Information",
        icon: "info",
    },
    [vscode.DiagnosticSeverity.Hint]: {
        label: "Hint",
        icon: "lightbulb",
    },
};

class DiagnosticItem extends Item {
    constructor(
        public label: string,
        public description: string,
        public detail: string,
        public line: number,
        public charPos: number
    ) {
        super(label, line, "", description, detail);
    }
}

function getFileDiagnostics(uri: vscode.Uri): DiagnosticItem[] {
    const currentFileDiagnostics = vscode.languages.getDiagnostics(uri);
    if (currentFileDiagnostics.length === 0) {
        vscode.window.showInformationMessage("No diagnostics found");
        return [];
    }

    const items: DiagnosticItem[] = [];

    for (let i = 0; i < currentFileDiagnostics.length; i++) {
        const error = currentFileDiagnostics[i];
        const errObj = diagnosticIcons[error.severity];

        const loc = `Ln ${error.range.start.line + 1}, Col ${error.range.start.character + 1}`;
        items.push(
            new DiagnosticItem(
                `$(${errObj.icon}) ${errObj.label}`,
                `${error.source} [${loc}]`,
                error.message,
                error.range.start.line,
                error.range.start.character
            )
        );
    }

    items.sort((a, b) => {
        return a.line - b.line;
    });

    return items;
}

interface LineCharPositionItem extends vscode.QuickPickItem {
    line: number;
    charPos: number;
}

function openLinePicker(editor: vscode.TextEditor, items: LineCharPositionItem[]): void {
    const quickPick = vscode.window.createQuickPick<LineCharPositionItem>();

    quickPick.title = "Diagnostics";
    quickPick.canSelectMany = false;
    quickPick.placeholder = "Search a diagnostic to jump to";
    quickPick.items = items;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Preselect the first item that is at or below the current cursor position.
    const cursorLine = editor.selection.active.line;
    quickPick.activeItems = [items.find((item) => item.line >= cursorLine) ?? items[items.length - 1]];

    quickPick.onDidChangeActive((items) => {
        if (!items.length) {
            return;
        }
        let p = new vscode.Position(items[0].line, items[0].charPos);
        editor.revealRange(new vscode.Range(p, p), vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(p, p);
    });

    quickPick.onDidAccept(() => {
        const item = quickPick.selectedItems[0];
        if (!item) {
            return;
        }
        const position = new vscode.Position(item.line, item.charPos);
        const selection = new vscode.Selection(position, position);
        editor.selection = selection;
        editor.revealRange(selection);

        quickPick.hide();
    });

    // If the picker was cancelled, go back to the starting position.
    const startingSelection = editor.selection;
    quickPick.onDidHide(() => {
        if (quickPick.selectedItems.length === 0) {
            editor.selection = startingSelection;
            editor.revealRange(startingSelection, vscode.TextEditorRevealType.InCenter);
        }
    });

    quickPick.show();
}

export function showFileDiagnostics(editor: vscode.TextEditor) {
    const items = getFileDiagnostics(editor.document.uri);
    if (items.length === 0) {
        return;
    }

    openLinePicker(editor, items);
}
