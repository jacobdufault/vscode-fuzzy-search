# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Fuzzy Search Plus is a fork of
[jacobdufault/vscode-fuzzy-search](https://github.com/jacobdufault/vscode-fuzzy-search)
(`jacobdufault.fuzzy-search` 0.0.3).

## [1.0.0]

### Added

- `Search: Fuzzy diagnostics`: search the diagnostics of the current file.
- `Search: Fuzzy git status`: search the changed files of the repository.
- `Search: Fuzzy git changes`: search the changed lines of the current file.
- `Search: Fuzzy git files`: search the files tracked by git.
- `Search: Fuzzy git files text`: search the text of the files tracked by git.

### Changed

- Renamed `Search: Fuzzy outline` to `Search: Fuzzy lines`.
- Renamed `Search: Fuzzy outline with current selection` to
  `Search: Fuzzy lines with current selection`.
- These two commands search the lines of the file, not its symbols. Command
  IDs are unchanged, so existing keybindings still work.
- `Search: Fuzzy lines` puts the cursor on the first match of the query,
  not at the start of the line.
- The extension activates when you run one of its commands, not at startup.
