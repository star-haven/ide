import * as vscode from 'vscode';

import { AreasProvider } from './tree-data-provider';

export function activate(context: vscode.ExtensionContext) {
	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
	if (rootPath)
		vscode.window.registerTreeDataProvider(
			'pm-world-areas',
			new AreasProvider(rootPath)
		);
}

export function deactivate() {}
