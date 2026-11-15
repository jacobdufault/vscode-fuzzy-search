import * as vscode from 'vscode';

import { Item } from "./fuzzy_item"
import { showGitChanges, showGitStatus } from './fuzzy_git';
import { showFileDiagnostics } from './fuzzy_diagnostics';
import { showGitFiles, showGitFilesText } from './fuzzy_workdir';


// Changes "5" to "0005", ie, ensures that |str| has |length| characters in it.
export function pad(str: string, length: number) {
  return '0'.repeat(length - str.length) + str
}

let valueFromPreviousInvocation = '';
let lastSelected: Item = new Item('', 0, '');

function showFuzzySearch(editor: vscode.TextEditor, quickPickEntries: Item[], useCurrentSelection: boolean) {
  if (quickPickEntries.length == 0) {
    return; 
  }
  // Build the entries we will show the user. One entry for each non-empty line,
  // prefixed with the line number. We prefix with the line number so lines stay
  // in the correct order and so duplicate lines do not get merged together.

  // Setup basic quick pick.
  let pick = vscode.window.createQuickPick<Item>();
  pick.items = quickPickEntries;
  pick.canSelectMany = false;

  // Try to preselect the previously selected item: same line text first, then same line number.
  const previous =
    quickPickEntries.find(t => t.label == lastSelected.label) ??
    quickPickEntries.find(t => t.line == lastSelected.line);
  if (previous) {
    pick.activeItems = [previous];
  }

  // Save the item the user selected so it can be pre-selected next time fuzzy
  // search is invoked.
  pick.onDidAccept(() => {
    const selected = pick.selectedItems[0];
    if (!selected) {
      return;
    }
    lastSelected = selected;

    // Find the first occurrence of the search string in the selected item.
    let charPos = selected.rawText
      .toLowerCase()
      .indexOf(pick.value.toLowerCase());

    if (charPos == -1) {
      charPos = 0;
    }

    const position = new vscode.Position(selected.line, charPos);
    const selection = new vscode.Selection(position, position);
    editor.selection = selection;

    pick.hide();
  });


  // Show the currently selected item in the editor.
  pick.onDidChangeActive(items => {
    if (!items.length) return;
    
    let p = new vscode.Position(items[0].line, 0);
    editor.revealRange(
    new vscode.Range(p, p), vscode.TextEditorRevealType.InCenter);
    editor.selection = new vscode.Selection(p, p);
  });


  if (useCurrentSelection) {
    pick.value = editor.document.getText(editor.selection);
  } else {
    // Show the previous search string. When the user types a character, the
    // preview string will replaced with the typed character.
    pick.value = valueFromPreviousInvocation;
    let previewValue = valueFromPreviousInvocation;
    let hasPreviewValue = previewValue.length > 0;
    pick.onDidChangeValue(value => {
      if (hasPreviewValue) {
        hasPreviewValue = false;

        // Try to figure out what text the user typed. Assumes that the user
        // typed at most one character.
        for (let i = 0; i < value.length; ++i) {
          if (previewValue.charAt(i) != value.charAt(i)) {
            pick.value = value.charAt(i);
            break;
          }
        }
      }
    });
    // Save the search string so we can show it next time fuzzy search is
    // invoked.
    pick.onDidChangeValue(value => valueFromPreviousInvocation = value);
  }

  // If fuzzy-search was cancelled navigate to the previous location.
  let startingSelection = editor.selection;
  pick.onDidHide(() => {
    if (pick.selectedItems.length == 0) {
      editor.revealRange(
        new vscode.Range(startingSelection.start, startingSelection.end),
        vscode.TextEditorRevealType.InCenter);
      editor.selection = startingSelection;
    }
  });

  pick.show();
}

function fuzzySearch(useCurrentSelection: boolean = false) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const lines: string[] = editor.document.getText().split(/\r?\n/);
  const maxNumberLength = lines.length.toString().length;
  const quickPickEntries: Item[] = [];

  for (let i = 0; i < lines.length; ++i) {
    if (lines[i]) {
      quickPickEntries.push(
        new Item(
          `${pad((i + 1).toString(), maxNumberLength)}: ${lines[i]}`,
          i,
          lines[i]
        )
      );
    }
  }

  showFuzzySearch(editor, quickPickEntries, useCurrentSelection);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.activeTextEditor", () => fuzzySearch())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.activeTextEditorWithCurrentSelection", () =>
            fuzzySearch(true)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.gitFiles", () => {
            showGitFiles();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.gitFilesText", () => {
            showGitFilesText();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.gitStatus", () => {
            showGitStatus();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.gitChanges", async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            showGitChanges(editor);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("fuzzySearch.activeTextEditorDiagnostics", () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            showFileDiagnostics(editor);
        })
    );
}
