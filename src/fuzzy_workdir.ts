import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as cp from "child_process";

import * as vscode from "vscode";

import { getGitRepository } from "./fuzzy_git";
import { Item } from "./fuzzy_item";

const exec = util.promisify(cp.exec);

const MAX_TEXT_FILE_SIZE = 1024 * 1024;

class GitFile extends Item {
    constructor(
        public label: string,
        public description: string,
        public detail: string,
        public uri: vscode.Uri
    ) {
        super(label, 0, "", description, detail);
        // TODO: would be cool to get the language icon... but how?
    }
}

async function getGitFiles(workspaceRoot: string): Promise<string[]> {
    try {
        // -z: NUL-separated, unquoted paths (non-ASCII names stay intact).
        const { stdout } = await exec("git ls-files -z", {
            cwd: workspaceRoot,
            maxBuffer: 64 * 1024 * 1024,
        });
        return stdout.split("\0").filter(Boolean);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to get git files: ${err}`);
        return [];
    }
}

let index = 0
let fileIndexMap: { [fsPath: string]: number } = {};

export async function showGitFiles() {
    const repo = getGitRepository();
    if (!repo) {
        return;
    }

    const files = await getGitFiles(repo.rootUri.fsPath);
    const items: GitFile[] = [];

    for (const file of files) {
        const filePath = path.join(repo.rootUri.fsPath, file);
        if (!fs.existsSync(filePath)) {
            continue
        }

        items.push(
            new GitFile(
                path.basename(file),
                path.extname(file),
                path.dirname(filePath),
                vscode.Uri.file(filePath)
            )
        );
    }

    items.sort((a, b) => {
        const aTime = fileIndexMap[a.uri.fsPath] || 0;
        const bTime = fileIndexMap[b.uri.fsPath] || 0;
        return bTime - aTime;
    });

    vscode.window
        .showQuickPick(items, {
            title: "Git files",
            placeHolder: "Select a file to open",
            matchOnDescription: true,
            matchOnDetail: true,
        })
        .then((item) => {
            if (!item) {
                return;
            }

            index++;
            fileIndexMap[item.uri.fsPath] = index;
            vscode.window.showTextDocument(item.uri);
        });
}

class GitFileText extends Item {
    constructor(
        public label: string,
        public description: string,
        public detail: string,
        public rawText: string,
        public line: number,
        public uri: vscode.Uri
    ) {
        super(label, line, rawText, description, detail);
    }
}
async function getGitFilesText(): Promise<GitFileText[]> {
    const repo = getGitRepository();
    if (!repo) {
        return [];
    }

    const root = repo.rootUri.fsPath;
    const files = await getGitFiles(root);
    const items: GitFileText[] = [];

    const contents = await Promise.all(
        files.map(async (file) => {
            const filePath = path.join(root, file);
            try {
                // shortcut: skips files over 1 MB (lockfiles, minified bundles); make it a setting if users ask.
                if ((await fs.promises.stat(filePath)).size > MAX_TEXT_FILE_SIZE) {
                    return null;
                }
                return { filePath, fileContent: await fs.promises.readFile(filePath) };
            } catch {
                // file could be deleted from disk but still present in git ls-files
                return null;
            }
        })
    );

    for (const entry of contents) {
        if (!entry) {
            continue;
        }
        const { filePath, fileContent } = entry;

        // Check if the file is binary. not always accurate, but good enough for most cases
        if (fileContent.includes(0)) {
            continue;
        }

        const lines = fileContent.toString("utf-8").split("\n");

        lines.forEach((text, line) => {
            if (text.length === 0) {
                return;
            }

            items.push(
                new GitFileText(
                    text.trim(),
                    `Line: ${line + 1}`,
                    path.relative(root, filePath),
                    text,
                    line,
                    vscode.Uri.file(filePath)
                )
            );
        });
    }
    return items;
}

interface LineCharPositionItem extends vscode.QuickPickItem {
    rawText: string;
    line: number;
    uri: vscode.Uri;
}

export async function openTextFilePicker(items: LineCharPositionItem[]) {
    const quickPick = vscode.window.createQuickPick<LineCharPositionItem>();
    quickPick.title = "Git files text";
    quickPick.placeholder = "Select a file to open";
    quickPick.items = items;

    quickPick.onDidAccept(async () => {
        const item = quickPick.selectedItems[0];
        if (!item) {
            return;
        }

        let charPos = item.rawText.toLowerCase().indexOf(quickPick.value.toLowerCase());
        if (charPos == -1) {
            charPos = 0;
        }

        const position = new vscode.Position(item.line, charPos);
        const selection = new vscode.Selection(position, position);

        const editor = await vscode.window.showTextDocument(item.uri);
        editor.selection = selection;
        editor.revealRange(selection);

        quickPick.hide();
    });

    quickPick.show();
}

export async function showGitFilesText() {
    const items = await getGitFilesText();
    if (items.length === 0) {
        vscode.window.showInformationMessage("No text files in workdir");
        return;
    }

    openTextFilePicker(items);
}
