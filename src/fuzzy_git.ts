import path = require("path");
import * as vscode from "vscode";
import { GitExtension, Repository, Status } from "vscode-git-types";
import { Item } from "./fuzzy_item";

/**
 * Represents a Git blame line pattern. (e.g. 00000000  ... 5 ) text)
 */
const GIT_BLAME_LINE_PATTERN = new RegExp(/(\d+)\)(?:\s(.+))?/);

/**
 * Represents a Git status record.
 */
interface StatusRecord {
    key: string;
    symbol: string;
    description: string;
    icon: string;
}

/**
 * represents a git status object.
 */
type GitChangeInfo = {
    status: StatusRecord;
    uri: vscode.Uri;
};

/**
 * Represents a Git item for quick pick.
 */
class GitItem extends Item {
    constructor(
        public label: string,
        public description: string,
        public detail: string,
        public status: string,
        public uri: vscode.Uri
    ) {
        super(label, 0, "", description, detail);
    }
}

/**
 * represents a hunk in git changes.
 */
type Hunk = {
    startLine: string;
    endLine: string;
    text: string;
};

/**
 * Represents a line hunk in Git changes.
 */
type LineHunk = {
    text: string;
    line: string;
};

// prettier-ignore
const StatusMap: Record<Status, StatusRecord> = {
    [Status.INDEX_MODIFIED]: { key: 'INDEX_MODIFIED', symbol: 'M', description: 'Modified in index', icon: 'diff-modified' },
    [Status.INDEX_ADDED]: { key: 'INDEX_ADDED', symbol: 'A', description: 'Added to index', icon: 'diff-added' },
    [Status.INDEX_DELETED]: { key: 'INDEX_DELETED', symbol: 'D', description: 'Deleted from index', icon: 'diff-removed' },
    [Status.INDEX_RENAMED]: { key: 'INDEX_RENAMED', symbol: 'R', description: 'Renamed in index', icon: 'diff-renamed' },
    [Status.INDEX_COPIED]: { key: 'INDEX_COPIED', symbol: 'C', description: 'Copied in index', icon: '' },
    [Status.MODIFIED]: { key: 'MODIFIED', symbol: 'M', description: 'Modified in working tree', icon: 'diff-modified' },
    [Status.DELETED]: { key: 'DELETED', symbol: 'D', description: 'Deleted in working tree', icon: 'diff-removed' },
    [Status.UNTRACKED]: { key: 'UNTRACKED', symbol: '?', description: 'Untracked', icon: 'diff-added' },
    [Status.IGNORED]: { key: 'IGNORED', symbol: '!', description: 'Ignored', icon: 'diff-ignored' },
    [Status.INTENT_TO_ADD]: { key: 'INTENT_TO_ADD', symbol: 'A', description: 'Intent to add', icon: 'diff-added' },
    [Status.INTENT_TO_RENAME]: { key: 'INTENT_TO_RENAME', symbol: 'R', description: 'Intent to rename', icon: 'diff-renamed' },
    [Status.TYPE_CHANGED]: { key: 'TYPE_CHANGED', symbol: 'T', description: 'Type changed', icon: '' },
    [Status.ADDED_BY_US]: { key: 'ADDED_BY_US', symbol: 'U', description: 'Added by us in merge', icon: 'git-merge' },
    [Status.ADDED_BY_THEM]: { key: 'ADDED_BY_THEM', symbol: 'T', description: 'Added by them in merge', icon: 'git-merge' },
    [Status.DELETED_BY_US]: { key: 'DELETED_BY_US', symbol: 'U', description: 'Deleted by us in merge', icon: 'git-merge' },
    [Status.DELETED_BY_THEM]: { key: 'DELETED_BY_THEM', symbol: 'T', description: 'Deleted by them in merge', icon: 'git-merge' },
    [Status.BOTH_ADDED]: { key: 'BOTH_ADDED', symbol: 'B', description: 'Both added in merge', icon: 'git-merge' },
    [Status.BOTH_DELETED]: { key: 'BOTH_DELETED', symbol: 'B', description: 'Both deleted in merge', icon: 'git-merge' },
    [Status.BOTH_MODIFIED]: { key: 'BOTH_MODIFIED', symbol: 'B', description: 'Both modified in merge', icon: 'git-merge' },
};

function makeGitStatusObject(gitStatusCode: Status, uri: vscode.Uri): GitChangeInfo {
    return { status: StatusMap[gitStatusCode], uri: uri };
}

/**
 * Retrieves the Git repository that contains the active editor's file, or the
 * first repository when there is no active editor.
 * @returns The Git repository or null if not found.
 */
export function getGitRepository(): Repository | null {
    const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports;
    if (!gitExtension) {
        vscode.window.showErrorMessage("Git extension not found");
        return null;
    }

    const git = gitExtension.getAPI(1);
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const repo = (activeUri && git.getRepository(activeUri)) || git.repositories[0];

    if (!repo) {
        vscode.window.showErrorMessage("No git repositories found");
        return null;
    }
    return repo;
}

/**
 * Retrieves the Git status.
 * @returns A promise that resolves to an array of Git status objects.
 */
function getGitStatuses(repo: Repository): GitChangeInfo[] {
    const gitStatusList: GitChangeInfo[] = [];

    for (const change of repo.state.indexChanges) {
        gitStatusList.push(makeGitStatusObject(change.status, change.uri));
    }

    for (const change of repo.state.untrackedChanges) {
        gitStatusList.push(makeGitStatusObject(change.status, change.uri));
    }

    for (const change of repo.state.workingTreeChanges) {
        gitStatusList.push(makeGitStatusObject(change.status, change.uri));
    }

    return gitStatusList;
}

/**
 * Shows a quick pick of Git status.
 */
export function showGitStatus() {
    const repo = getGitRepository();
    if (!repo) {
        return;
    }

    const gitStatus = getGitStatuses(repo);
    if (gitStatus.length === 0) {
        vscode.window.showInformationMessage("No git changes found");
        return;
    }

    const pickerItems: GitItem[] = [];

    for (const file of gitStatus) {
        pickerItems.push(
            new GitItem(
                `$(${file.status.icon}) ${path.relative(repo.rootUri.fsPath, file.uri.fsPath)}`,
                file.status.symbol,
                file.status.description,
                file.status.key,
                file.uri
            )
        );
    }

    vscode.window
        .showQuickPick(pickerItems, {
            title: "Git status",
            placeHolder: "Select a file to open",
            matchOnDescription: true,
        })
        .then((item) => {
            if (!item) {
                return;
            }
            // TODO: We cannot open deleted files directly, but they are still present in git history.
            // We could follow the approach used by vscode and create a read-only text document for them.
            if (item.status === "DELETED") {
                vscode.window.showInformationMessage("Cannot open deleted file");
                return;
            }
            vscode.window.showTextDocument(item.uri);
        });
}

/**
 * Get git changes by parsing the blame output.
 * @returns A promise that resolves to an array of Hunk.
 */
function parseBlameOutput(blameOutput: String): Hunk[] {
    let lines: LineHunk[] = [];
    const hunkList: Hunk[] = [];

    const addHunk = function () {
        if (lines.length === 0) {
            return;
        }

        hunkList.push({
            startLine: lines[0].line,
            endLine: lines[lines.length - 1].line,
            text: lines
                .map((value) => {
                    return value.text;
                })
                .join("\n"),
        });
        lines.length = 0;
    };

    for (const line of blameOutput.split("\n")) {
        if (line.startsWith("00000000")) {
            const match = GIT_BLAME_LINE_PATTERN.exec(line);
            if (match) {
                lines.push({ line: match[1], text: match[2] || "New line" });
            }
        } else {
            addHunk();
        }
    }

    // we could finish a file with a hunk so we need to add it
    addHunk();
    return hunkList;
}

async function getGitChanges(editor: vscode.TextEditor): Promise<Item[]> {
    const repo = getGitRepository();
    if (!repo) {
        return [];
    }

    const activeFile = getGitStatuses(repo).find(
        (change) => change.uri.fsPath === editor.document.uri.fsPath
    );

    if (!activeFile) {
        vscode.window.showInformationMessage("No git changes found");
        return [];
    }

    if (["UNTRACKED", "DELETED"].includes(activeFile.status.key)) {
        vscode.window.showInformationMessage(
            `Cannot show changes. Reason: ${activeFile.status.description}`
        );
        return [];
    }

    // Use git blame to retrieve the full file and its line count, which makes it
    // easier to parse compared to diff HEAD.
    // TODO: git blame does not display deleted lines which could be useful.
    const gitChanges = parseBlameOutput(await repo.blame(activeFile.uri.fsPath));

    if (gitChanges.length === 0) {
        vscode.window.showInformationMessage("No git changes found");
        return [];
    }

    const pickerItems: Item[] = [];

    gitChanges.forEach((file) => {
        pickerItems.push(
            new Item(
                `$(git-commit) ${file.text.trim()}`,
                Number(file.startLine) - 1,
                file.text,
                "",
                `Line: ${file.startLine} - ${file.endLine}`,
            )
        );
    });

    return pickerItems;
}

function openGitChanges(editor: vscode.TextEditor, items: Item[]): void {
    const quickPick = vscode.window.createQuickPick<Item>();
    quickPick.title = "Git changes";
    quickPick.placeholder = "Select a change to jump to";
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
        let p = new vscode.Position(items[0].line, 0);
        editor.revealRange(new vscode.Range(p, p), vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(p, p);
    });

    quickPick.onDidAccept(() => {
        const item = quickPick.selectedItems[0];
        if (!item) {
            return;
        }

        let charPos = item.rawText.search(/\S/);
        if (charPos == -1) {
            charPos = 0;
        }

        const position = new vscode.Position(item.line, charPos);
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

export async function showGitChanges(editor: vscode.TextEditor) {
    // getGitChanges already tells the user why the list is empty.
    const items = await getGitChanges(editor);
    if (items.length === 0) {
        return;
    }

    openGitChanges(editor, items);
}
