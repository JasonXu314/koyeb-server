import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';

export type Directory = {
	name: string;
	files: string[];
	dirs: Directory[];
};

@Injectable()
export class FilesystemService {
	constructor() {
		if (!fs.existsSync('./filesystem')) {
			fs.mkdirSync('filesystem');
		}
	}

	public constructPath(workspace: string, path: string): string {
		return join(process.cwd(), 'filesystem', workspace, path);
	}

	public indexWorkspace(workspace: string): Directory {
		return this._readDirectory(`./filesystem/${workspace}`);
	}

	public isValidResource(workspace: string, path: string): boolean {
		const fullPath = this.constructPath(workspace, path);

		return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
	}

	public readFile(workspace: string, path: string): string {
		const fullPath = this.constructPath(workspace, path);

		if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
			return fs.readFileSync(fullPath).toString();
		} else {
			throw new NotFoundException('File not found');
		}
	}

	public writeFile(workspace: string, path: string, file: string): void {
		const fullPath = this.constructPath(workspace, path);

		fs.writeFileSync(fullPath, file);
	}

	private _readDirectory(path: string): Directory {
		const out: Directory = {
			name: path.split('/').at(-1),
			files: [],
			dirs: []
		};

		fs.readdirSync(path).forEach((fileOrDir) => {
			const fileOrDirPath = `${path}/${fileOrDir}`;

			if (fs.statSync(fileOrDirPath).isDirectory()) {
				out.dirs.push(this._readDirectory(fileOrDirPath));
			} else {
				out.files.push(fileOrDir);
			}
		});

		return out;
	}
}
