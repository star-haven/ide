import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class AreasProvider implements vscode.TreeDataProvider<Item> {
	private readonly dir: string;

  constructor(private workspaceRoot: string) {
		this.dir = path.join(workspaceRoot, 'src', 'world');

		// If workspaceroot/src/world/ changes structure, refresh.
		const watcher = vscode.workspace.createFileSystemWatcher(path.join(this.dir, '**'), false, true, false);
		watcher.onDidCreate(() => this.refresh());
		watcher.onDidDelete(() => this.refresh());
	}

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  getChildren(item?: Item): Thenable<Item[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No dependency in empty workspace');
      return Promise.resolve([]);
    }

    if (item) {
			if (item.type === ItemType.AREA)
      	return this.getMaps(item);
			else
				return Promise.resolve([]);
    } else {
      return this.getAreas(path.join(this.workspaceRoot, 'src', 'world'));
    }
  }

  private async getAreas(worldPath: string): Promise<Item[]> {
		// Areas are subdirectories in the form "area_xxx".
		const listing = await fs.promises.readdir(worldPath)
		const objs = await Promise.all(
			listing
				.filter(dir => dir.startsWith("area_"))
				.map(async dir => {
					const stat = await fs.promises.stat(path.join(worldPath, dir));
					return { dir, isDirectory: stat.isDirectory() };
				})
		);
		return objs
			.filter(({ isDirectory }) => isDirectory)
			.map(({ dir }) => new Item(path.join(worldPath, dir), ItemType.AREA));
  }

	private async getMaps(area: Item): Promise<Item[]> {
		// Maps are subdirectores of the area in the form "xxx_yy".
		const listing = await fs.promises.readdir(area.path);
		const objs = await Promise.all(
			listing
				.filter(dir => dir.startsWith(area.areaShortname + "_"))
				.map(async dir => {
					const stat = await fs.promises.stat(path.join(area.path, dir));
					return { dir, isDirectory: stat.isDirectory() };
				})
		);
		return objs
			.filter(({ isDirectory }) => isDirectory)
			.map(({ dir }) => new Item(path.join(area.path, dir), ItemType.MAP));
	}

	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

enum ItemType {
	AREA,
	MAP,
}

class Item extends vscode.TreeItem {
	public readonly path: string;
	public readonly type: ItemType;
	public readonly areaShortname: string;

  constructor(public readonly p: string, public readonly t: ItemType) {
		const basename = path.basename(p);
    super(basename, t === ItemType.AREA ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		this.path = p;
		this.type = t;
    if (t === ItemType.MAP) {
      this.areaShortname = basename.split("_")[0];
      this.iconPath = path.join(__filename, '..', '..', 'resources', 'map.svg');
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(p)]
      };
    } else if (t === ItemType.AREA) {
      this.areaShortname = basename.split("_")[1];
      this.iconPath = path.join(__filename, '..', '..', 'resources', 'area.svg');
    }
  }
}
