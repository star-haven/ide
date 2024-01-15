import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import assert = require('assert');

export class AreasProvider implements vscode.TreeDataProvider<Item> {
	private readonly dir: string;

  constructor(private workspaceRoot: string) {
		this.dir = path.join(workspaceRoot, 'src', 'world');

		// If workspaceroot/src/world/ changes structure, refresh.
		const watcher = vscode.workspace.createFileSystemWatcher(path.join(this.dir, '**'), false, true, false);
		watcher.onDidCreate(() => this.refresh());
		watcher.onDidDelete(() => this.refresh());

    this.readWorldC();
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
      else if (item.type === ItemType.MAP)
        return this.getMapFiles(item);
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
			.map(({ dir }) => new Item(path.join(worldPath, dir), ItemType.AREA, this.areaToName.get(dir) ?? dir));
  }

	private async getMaps(area: Item): Promise<Item[]> {
		// Maps are subdirectores of the area in the form "xxx_yy".
		const listing = await fs.promises.readdir(area.path);
		const objs = await Promise.all(
			listing
				.filter(dir => dir.startsWith(area.areaShortname + "_"))
				.map(async dir => {
					const stat = await fs.promises.stat(path.join(area.path, dir));

          // If there is a header file for the map, read its @brief comment.
          let brief = dir; // Default to the name of the map.
          const headerPath = path.join(area.path, dir, dir + ".h");
          if (await fs.promises.access(headerPath).then(() => true).catch(() => false)) {
            const header = await fs.promises.readFile(headerPath, 'utf8');
            const match = header.match(/@brief (.*)/);
            if (match) {
              brief = match[1];

              // If the brief is formatted as "$Area - $Map" then just use $Map.
              const areaMapMatch = brief.match(/(.*) - (.*)/);
              if (areaMapMatch) {
                brief = areaMapMatch[2];
              }
            }
          }

					return { dir, brief, isDirectory: stat.isDirectory() };
				})
		);
		return objs
			.filter(({ isDirectory }) => isDirectory)
			.map(({ dir, brief }) => new Item(path.join(area.path, dir), ItemType.MAP, brief));
	}

  // TODO: also get the assets for the map
  private async getMapFiles(map: Item): Promise<Item[]> {
    assert(map.type === ItemType.MAP);
    const listing = await fs.promises.readdir(map.path);
    return listing.map(file => new Item(path.join(map.path, file), ItemType.FILE, file));
  }

  private areaToName: Map<string, string> = new Map();
  private async readWorldC() {
    this.areaToName = new Map();

    const file = path.join(this.workspaceRoot, 'src', 'world', 'world.c');

    try {
      const lines = await fs.promises.readFile(file, 'utf8').then(data => data.split("\n"));

      // Search from the bottom of world.c for lines like `AREA($area, "name")` until we see the gAreas definition.
      for (let lineNo = lines.length - 1; lineNo >= 0; lineNo--) {
        const line = lines[lineNo];
        const match = line.match(/AREA\((.*), "(.*)"\)/);
        if (match) {
          this.areaToName.set("area_" + match[1], match[2]);
        } else if (line.includes("gAreas[] =")) {
          break;
        }
      }
    } catch (err) {
      if (err?.code === 'ENOENT') {
        console.warn(`Could not read ${file}`);
      } else {
        throw err;
      }
    }
  }

	private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh(): Promise<void> {
    await this.readWorldC();
    this._onDidChangeTreeData.fire();
  }
}

enum ItemType {
	AREA,
	MAP,
  FILE,
}

class Item extends vscode.TreeItem {
	public readonly path: string;
	public readonly type: ItemType;
	public readonly areaShortname: string;

  constructor(public readonly p: string, public readonly t: ItemType, public readonly label: string) {
    super(label, t === ItemType.FILE ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
		this.path = p;
		this.type = t;
    const basename = path.basename(p);
    if (t === ItemType.MAP) {
      this.areaShortname = basename.split("_")[0];
      this.tooltip = basename;
      this.iconPath = path.join(__filename, '..', '..', 'resources', 'map.svg');
    } else if (t === ItemType.AREA) {
      this.areaShortname = basename.split("_")[1];
      this.tooltip = basename;
      this.iconPath = path.join(__filename, '..', '..', 'resources', 'area.svg');
    } else if (t === ItemType.FILE) {
      this.areaShortname = ""; // OK because it won't be used.
      this.iconPath = new vscode.ThemeIcon('file');
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(p)]
      };
    }
  }
}
