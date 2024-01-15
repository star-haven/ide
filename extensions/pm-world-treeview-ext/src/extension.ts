import * as vscode from 'vscode';
import * as path from 'path';

import { AreasProvider } from './tree-data-provider';

const addArea = (rootPath: string) => async () => {
	const areaName = await vscode.window.showInputBox({
		prompt: 'Area name',
		placeHolder: 'A descriptive name of the area',
	});
	if (!areaName) return;
	let areaShortName = "";
	while (areaShortName.length != 3) {
		const response = await vscode.window.showInputBox({
			prompt: 'Area ID',
			placeHolder: 'A 3-letter short name',
		});
		if (!response) return;
		areaShortName = response.toLowerCase();
	}

	// Create area folder.
	const dirPath = path.join(rootPath, 'src', 'world', 'area_' + areaShortName);
	await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));

	// Create area header file.
	const headerPath = path.join(dirPath, areaShortName + '.h');
	const up = areaShortName.toUpperCase();
	const headerGuard = `WORLD_AREA_${up}_${up}_H`;
	const content =
`#ifndef ${headerGuard}
#define ${headerGuard}

enum {
    AB_${up}_Unused_0     = AreaByte(0),
    AB_${up}_Unused_1     = AreaByte(1),
    AB_${up}_Unused_2     = AreaByte(2),
    AB_${up}_Unused_3     = AreaByte(3),
    AB_${up}_Unused_4     = AreaByte(4),
    AB_${up}_Unused_5     = AreaByte(5),
    AB_${up}_Unused_6     = AreaByte(6),
    AB_${up}_Unused_7     = AreaByte(7),
    AB_${up}_Unused_8     = AreaByte(8),
    AB_${up}_Unused_9     = AreaByte(9),
    AB_${up}_Unused_A     = AreaByte(10),
    AB_${up}_Unused_B     = AreaByte(11),
    AB_${up}_Unused_C     = AreaByte(12),
    AB_${up}_Unused_D     = AreaByte(13),
    AB_${up}_Unused_E     = AreaByte(14),
    AB_${up}_Unused_F     = AreaByte(15),
};

#endif
`;
	await vscode.workspace.fs.writeFile(vscode.Uri.file(headerPath), Buffer.from(content));

	// Add to gAreas
	const worldC = vscode.Uri.file(path.join(rootPath, 'src', 'world', 'world.c'));
	const worldCContent = await vscode.workspace.fs.readFile(worldC);
	const worldCContentStr = worldCContent.toString();
	const lines = worldCContentStr.split('\n');
	// Find where gAreas declaration is from bottom
	let gAreasLineNo = -1;
	for (let lineNo = lines.length - 1; lineNo >= 0; lineNo--) {
		const line = lines[lineNo];
		if (line.includes('gAreas[] =')) {
			gAreasLineNo = lineNo;
			break;
		}
	}
	if (gAreasLineNo == -1) {
		vscode.window.showErrorMessage('Could not find gAreas declaration in world.c');
		return;
	}
	// Find where the terminator area is and insert new area just before it
	for (let lineNo = gAreasLineNo + 1; lineNo < lines.length; lineNo++) {
		const line = lines[lineNo];
		if (line.includes('{}')) {
			lines.splice(lineNo, 0, `    AREA(${areaShortName}, ${JSON.stringify(areaName)}),`);
			break;
		}
	}
	await vscode.workspace.fs.writeFile(worldC, Buffer.from(lines.join('\n')));

	// Increment gAreas size in header
	// TODO
};

const addMap = (rootPath: string) => async () => {
	// TODO
};

const deleteItem = (rootPath: string) => async (item: any) => {
	// TODO
	console.log(item);
};

export function activate(context: vscode.ExtensionContext) {
	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
	if (rootPath) {
		vscode.window.registerTreeDataProvider(
			'pm-world-areas',
			new AreasProvider(rootPath)
		);
		vscode.commands.registerCommand('pm-world.addArea', addArea(rootPath));
		vscode.commands.registerCommand('pm-world.addMap', addMap(rootPath));
		vscode.commands.registerCommand('pm-world.delete', deleteItem(rootPath));
	}
}

export function deactivate() {}
