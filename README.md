# Fuzzy Search Plus

Jump anywhere with a fuzzy search in the VS Code quick pick. Type a few
characters, pick a result, and press Enter to go there. When you search the
current file, the editor follows the selected result as you move through the
list, and Escape takes you back to where you were.

You can search:

- the lines of the current file
- the errors, warnings and hints of the current file
- the files with git changes, and the changed lines of the current file
- the files tracked by git, and the text inside them

Bind `fuzzySearch.activeTextEditor` (`Search: Fuzzy lines`) to a keyboard
shortcut to search the current file quickly.

This extension is a fork of
[jacobdufault/vscode-fuzzy-search](https://github.com/jacobdufault/vscode-fuzzy-search),
which was last updated in 2020. The fork adds the diagnostics and git
searches.

## Available Commands

All commands are available by opening the Command Palette (`Command+Shift+P` on macOS and `Ctrl+Shift+P` on Windows/Linux) and typing in one of the following Command Names:

| Command Name                                   | Description                                           | Command ID                                         |
| ---------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `Search: Fuzzy lines`                          | Fuzzy search through the lines of the current file    | `fuzzySearch.activeTextEditor`                     |
| `Search: Fuzzy lines with current selection`   | Fuzzy search lines, starting with current selection   | `fuzzySearch.activeTextEditorWithCurrentSelection` |
| `Search: Fuzzy diagnostics`                    | Fuzzy search through current file's diagnostics       | `fuzzySearch.activeTextEditorDiagnostics`          |
| `Search: Fuzzy git status`                     | Fuzzy search through git status of working directory  | `fuzzySearch.gitStatus`                            |
| `Search: Fuzzy git changes`                    | Fuzzy search through git changes in current file      | `fuzzySearch.gitChanges`                           |
| `Search: Fuzzy git files`                      | Fuzzy search through git-tracked files in working dir | `fuzzySearch.gitFiles`                              |
| `Search: Fuzzy git files text`                 | Fuzzy search text in git-tracked files of working dir | `fuzzySearch.gitFilesText`                          |

- By default, the extension does not provide any shortcut. But you can assign each command to one. (see [Key Bindings for Visual Studio Code](https://code.visualstudio.com/docs/getstarted/keybindings) for more information).

    Example `keybindings.json` :

    ```json
    [
        {
            "key": "alt+shift+o",
            "command": "fuzzySearch.activeTextEditor",
            "when": "editorTextFocus"
        },
        {
            "key": "alt+shift+d",
            "command": "fuzzySearch.activeTextEditorDiagnostics",
            "when": "editorTextFocus"
        },
        {
            "key": "alt+shift+g",
            "command": "fuzzySearch.gitStatus"
        }
    ]
    ```

## Known Issues

- `Fuzzy git status` does not show deleted git files.
- `Fuzzy git changes` does not show deleted lines.
- `Fuzzy git files` does not show new files (files that are not yet tracked by git).

## Demo

![Demo](https://raw.githubusercontent.com/sisoe24/vscode-fuzzy-search/master/images/demo.gif)
