import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import * as fs from 'fs';
import * as JSZip from 'jszip';

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

	public constructAssetPath(...parts: string[]): string {
		return `./assets/${parts.join('/')}`;
	}

	public constructProjectPath(...parts: string[]): string {
		return `./filesystem/${parts.join('/')}`;
	}

	public indexWorkspace(workspace: string): Directory {
		return this._readDirectory(this.constructProjectPath(workspace));
	}

	public async createWorkspace(name: string, rawZip?: Express.Multer.File): Promise<void> {
		if (!fs.existsSync(this.constructProjectPath(name))) {
			if (rawZip) {
				const zip = new JSZip();
				await zip.loadAsync(rawZip.buffer);

				if (Object.values(zip.files).some((file) => file.dir && file.name === `${name}/routes/`)) {
					await this.unpack(zip, 'filesystem');
				} else if (Object.values(zip.files).some((file) => file.dir && file.name === `routes/`)) {
					await this.unpack(zip, this.constructProjectPath(name));
				} else {
					throw new BadRequestException(
						'Your project must contain a routes directory or a directory with the same name as your project, containing a routes directory at the root level.'
					);
				}
			} else {
				fs.mkdirSync(this.constructProjectPath(name));
				fs.mkdirSync(this.constructProjectPath(name, 'routes'));
				fs.mkdirSync(this.constructProjectPath(name, 'public'));

				fs.writeFileSync(
					this.constructProjectPath(name, 'routes', 'index.html'),
					fs
						.readFileSync(this.constructAssetPath('pub-dev-template-project', 'routes', 'index.html'))
						.toString()
						.replace(/PROJECT_NAME/g, name)
				);
				fs.writeFileSync(
					this.constructProjectPath(name, 'public', 'favicon.ico'),
					fs.readFileSync(this.constructAssetPath('pub-dev-template-project', 'public', 'favicon.ico'))
				);
			}
		} else {
			throw new BadRequestException('Workspace already exists');
		}
	}

	public exists(workspace: string, path: string): boolean {
		return fs.existsSync(this.constructProjectPath(workspace, path));
	}

	public isFile(workspace: string, path: string): boolean {
		return this.exists(workspace, path) && fs.statSync(this.constructProjectPath(workspace, path)).isFile();
	}

	public isRoute(workspace: string, path: string): boolean {
		const fullPath = this.constructProjectPath(workspace, 'routes', path);

		return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
	}

	public readRoute(workspace: string, path: string): string {
		return fs.readFileSync(this.constructProjectPath(workspace, 'routes', path)).toString();
	}

	public isStaticResource(workspace: string, path: string): boolean {
		const fullPath = this.constructProjectPath(workspace, 'public', path);

		return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
	}

	public readStaticResource(workspace: string, path: string): StreamableFile {
		return new StreamableFile(fs.createReadStream(this.constructProjectPath(workspace, 'public', path)), { type: this._getMIMEType(path) });
	}

	public readFile(workspace: string, path: string): string {
		const fullPath = this.constructProjectPath(workspace, path);

		if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
			return fs.readFileSync(fullPath).toString();
		} else {
			throw new NotFoundException('File not found');
		}
	}

	public writeFile(workspace: string, path: string, content: string | Buffer): void {
		const fullPath = this.constructProjectPath(workspace, path);

		fs.writeFileSync(fullPath, content);
	}

	public createDirectory(workspace: string, path: string): void {
		const fullPath = this.constructProjectPath(workspace, path);

		if (!fs.existsSync(fullPath)) {
			fs.mkdirSync(fullPath);
		}
	}

	public async unpack(zip: JSZip, destination: string): Promise<void> {
		await Promise.all(
			Object.entries(zip.files)
				.filter(([, file]) => !file.dir)
				.map(async ([file, data]) => {
					const fullPath = `${destination}/${file}`;

					fullPath
						.split('/')
						.slice(0, -1)
						.reduce((prevPath, dir) => {
							const dirPath = prevPath === '' ? dir : `${prevPath}/${dir}`;

							if (!fs.existsSync(dirPath)) {
								fs.mkdirSync(dirPath);
							}

							return dirPath;
						}, '');

					fs.writeFileSync(fullPath, await data.async('nodebuffer'));
				})
		);
	}

	private _getMIMEType(file: string): string {
		if (file.endsWith('.js')) {
			return 'application/javascript';
		} else if (file.endsWith('.css')) {
			return 'text/css';
		} else if (file.endsWith('.html')) {
			return 'text/html';
		} else if (file.endsWith('.json')) {
			return 'application/json';
		} else if (file.endsWith('.png')) {
			return 'image/png';
		} else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
			return 'image/jpeg';
		} else if (file.endsWith('.svg')) {
			return 'image/svg+xml';
		} else if (file.endsWith('.ico')) {
			return 'image/x-icon';
		} else if (file.endsWith('.txt')) {
			return 'text/plain';
		} else if (file.endsWith('.xml')) {
			return 'text/xml';
		} else if (file.endsWith('.pdf')) {
			return 'application/pdf';
		} else if (file.endsWith('.csv')) {
			return 'text/csv';
		} else {
			return 'application/octet-stream';
		}
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
