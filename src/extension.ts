import * as path from 'path';
import * as vscode from 'vscode';

class Item implements vscode.QuickPickItem {
  description: string
  detail: string

  constructor(public label: string, public line: number) {
    this.label = label.trim();
  }
}

// Changes "5" to "0005", ie, ensures that |str| has |length| characters in it.
function pad(str: string, length: number) {
  return '0'.repeat(length - str.length) + str
}

function showQuickPick() {
  // Build the entries we will show the user. One entry for each non-empty
  // line, prefixed with the line number. We prefix with the line number so
  // lines stay in the correct order and so duplicate lines do not get merged
  // together.
  let lines: string[] =
      vscode.window.activeTextEditor.document.getText().split(/\r?\n/);
  let maxNumberLength = lines.length.toString().length;
  let quickPickEntries = [];
  for (let i = 0; i < lines.length; ++i) {
    if (lines[i]) {
      quickPickEntries.push(
          new Item(`${pad(i.toString(), maxNumberLength)}: ${lines[i]}`, i));
    }
  }

  // vscode calls this on the first item. We don't want to navigate to there
  // right away.
  let ignoreFirstNavigate = true;
  // If the user cancels the navigation we want to go back to the original
  // location in the document.
  let startingSelection = vscode.window.activeTextEditor.selection;
  function navigateTo(item: Item|undefined) {
    if (ignoreFirstNavigate) {
      ignoreFirstNavigate = false;
      return;
    }

    // Failed.
    if (!item) {
      vscode.window.activeTextEditor.revealRange(
          new vscode.Range(startingSelection.start, startingSelection.end),
          vscode.TextEditorRevealType.InCenter);
      vscode.window.activeTextEditor.selection = startingSelection;
      return;
    }

    // Selected.
    let p = new vscode.Position(item.line, 0);
    vscode.window.activeTextEditor.revealRange(
        new vscode.Range(p, p), vscode.TextEditorRevealType.InCenter);
    vscode.window.activeTextEditor.selection = new vscode.Selection(p, p);
  };

  // Without the |then| we do not get cancellation calls.
  vscode.window
      .showQuickPick(
          quickPickEntries,
          <vscode.QuickPickOptions>{onDidSelectItem: navigateTo})
      .then(navigateTo);
}

export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(
      'fuzzySearch.activeTextEditor', showQuickPick);
}
