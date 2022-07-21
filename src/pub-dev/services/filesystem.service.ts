import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import * as JSZip from 'jszip';
import { FSService } from './fs.service';

export type Directory = {
	name: string;
	files: string[];
	dirs: Directory[];
};

@Injectable()
export class FilesystemService {
	constructor(private fs: FSService) {
		if (!fs.exists('filesystem')) {
			fs.mkdir('filesystem');
		}
	}

	public constructAssetPath(...parts: string[]): string {
		return this.fs.resolve('assets', ...parts);
	}

	public constructProjectPath(...parts: string[]): string {
		return this.fs.resolve('filesystem', ...parts);
	}

	public indexWorkspace(workspace: string): Directory {
		return this._readDirectory(this.constructProjectPath(workspace));
	}

	public async createWorkspace(name: string, rawZip?: Express.Multer.File): Promise<void> {
		if (!this.fs.exists(this.constructProjectPath(name))) {
			if (rawZip) {
				const zip = new JSZip();
				await zip.loadAsync(rawZip.buffer);

				if (Object.values(zip.files).some((file) => file.dir && (file.name === `routes/` || file.name === `${name}/routes/`))) {
					await this.unpack(zip, this.constructProjectPath(name));
				} else {
					throw new BadRequestException(
						'Your project must contain a routes directory (or a directory with the same name as your project that contains a routes directory) at the root level.'
					);
				}
			} else {
				const templateZip = new JSZip(),
					zip = new JSZip();
				await templateZip.loadAsync(this.fs.readBuffer(this.constructAssetPath('pub-dev-templates', 'starter.zip')));

				await Promise.all(
					Object.entries(templateZip.files).map(async ([path, file]) => {
						if (!file.dir) {
							const contents = await file.async('string');

							zip.file(path.replace('starter', name), contents.replace(/\$PROJECT_NAME\$/g, name));
						} else {
							zip.folder(path.replace('starter', name));
						}
					})
				);

				await this.unpack(zip, 'filesystem');
			}
		} else {
			throw new BadRequestException('Workspace already exists');
		}
	}

	public exists(workspace: string, path: string): boolean {
		return this.fs.exists(this.constructProjectPath(workspace, path));
	}

	public isFile(workspace: string, path: string): boolean {
		return this.exists(workspace, path) && this.fs.stat(this.constructProjectPath(workspace, path)).isFile();
	}

	public isDirectory(workspace: string, path: string): boolean {
		return this.exists(workspace, path) && this.fs.stat(this.constructProjectPath(workspace, path)).isDirectory();
	}

	public isRoute(workspace: string, path: string): boolean {
		const fullPath = this.constructProjectPath(workspace, 'routes', path);

		return this.fs.exists(fullPath) && this.fs.stat(fullPath).isFile();
	}

	public readRoute(workspace: string, path: string): string {
		return this.fs.read(this.constructProjectPath(workspace, 'routes', path));
	}

	public isStaticResource(workspace: string, path: string): boolean {
		const fullPath = this.constructProjectPath(workspace, 'public', path);

		return this.fs.exists(fullPath) && this.fs.stat(fullPath).isFile();
	}

	public readStaticResource(workspace: string, path: string): StreamableFile {
		return new StreamableFile(this.fs.createReadStream(this.constructProjectPath(workspace, 'public', path)), { type: this._getMIMEType(path) });
	}

	public readFile(workspace: string, path: string): string {
		const fullPath = this.constructProjectPath(workspace, path);

		if (this.fs.exists(fullPath) && this.fs.stat(fullPath).isFile()) {
			return this.fs.read(fullPath);
		} else {
			throw new NotFoundException('File not found');
		}
	}

	public writeFile(workspace: string, path: string, content: string | Buffer): void {
		const fullPath = this.constructProjectPath(workspace, path);

		this.fs.write(fullPath, content);
	}

	public deleteFile(workspace: string, path: string): void {
		const fullPath = this.constructProjectPath(workspace, path);

		if (this.fs.exists(fullPath) && this.fs.stat(fullPath).isFile()) {
			this.fs.rm(fullPath);
		} else {
			throw new NotFoundException('File not found');
		}
	}

	public deleteDirectory(workspace: string, path: string): void {
		const fullPath = this.constructProjectPath(workspace, path);

		if (this.fs.exists(fullPath) && this.fs.stat(fullPath).isDirectory()) {
			this.fs.rm(fullPath, { recursive: true });
		} else {
			throw new NotFoundException('Directory not found');
		}
	}

	public rename(workspace: string, path: string, newName: string): void {
		const fullPath = this.constructProjectPath(workspace, path);

		if (this.fs.exists(fullPath)) {
			this.fs.rename(fullPath, this.constructProjectPath(workspace, path.split('/').slice(0, -1).concat(newName).join('/')));
		} else {
			throw new NotFoundException('File/directory not found');
		}
	}

	public createDirectory(workspace: string, path: string): void {
		const fullPath = this.constructProjectPath(workspace, path);

		if (!this.fs.exists(fullPath)) {
			this.fs.mkdir(fullPath);
		}
	}

	public async unpack(zip: JSZip, destination: string, fileCB?: (path: string) => void): Promise<void> {
		const destDir: string = destination.split('/').at(-1);

		await Promise.all(
			Object.entries(zip.files)
				.filter(([, file]) => !file.dir)
				.map(async ([path, file]) => {
					const fullPath = path.startsWith(destDir) ? path.replace(`${destDir}/`, '') : `${destination}/${path}`;

					fullPath
						.split('/')
						.slice(0, -1)
						.reduce((prevPath, dir) => {
							const dirPath = prevPath === '' ? dir : `${prevPath}/${dir}`;

							if (!this.fs.exists(dirPath)) {
								this.fs.mkdir(dirPath);
							}

							return dirPath;
						}, '');

					this.fs.write(fullPath, await file.async('nodebuffer'));

					if (fileCB) {
						fileCB(path);
					}
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

		this.fs.readdir(path).forEach((fileOrDir) => {
			const fileOrDirPath = `${path}/${fileOrDir}`;

			if (this.fs.stat(fileOrDirPath).isDirectory()) {
				out.dirs.push(this._readDirectory(fileOrDirPath));
			} else {
				out.files.push(fileOrDir);
			}
		});

		return out;
	}
}
