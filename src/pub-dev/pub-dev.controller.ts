import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Header,
	InternalServerErrorException,
	OnModuleInit,
	Param,
	Patch,
	Post,
	Query,
	UnauthorizedException,
	UploadedFile,
	UseGuards,
	UseInterceptors
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import { Model } from 'mongoose';
import { StatusInterceptor } from 'src/statuses/status.interceptor';
import { Token } from './decorators/token.decorator';
import { WorkspaceGuard } from './guards/workspace.guard';
import { CookieInterceptor } from './interceptors/cookies.interceptor';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { EndpointService } from './services/endpoint.service';
import { Directory, FilesystemService } from './services/filesystem.service';

@Controller({
	host: `pub-dev.${process.env.LOCATION}`
})
@UseInterceptors(StatusInterceptor)
export class PubDevController implements OnModuleInit {
	constructor(
		@InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
		private fsService: FilesystemService,
		private endpointService: EndpointService
	) {}

	@Get('/workspace/:name')
	@UseInterceptors(CookieInterceptor)
	public async getWorkspaceByName(@Param('name') name: string, @Token() token: string): Promise<Workspace> {
		const result = await this.workspaceModel.findOne({ name });

		if (result) {
			if (!token) {
				throw new UnauthorizedException('Missing token');
			} else {
				if (result.token === token) {
					return result;
				} else {
					throw new UnauthorizedException('Incorrect token');
				}
			}
		} else {
			return this.createWorkspace(name);
		}
	}

	@Post('/workspace/:name')
	@UseInterceptors(CookieInterceptor)
	@UseInterceptors(FileInterceptor('file'))
	public async createWorkspace(@Param('name') name: string, @UploadedFile() rawZip?: Express.Multer.File): Promise<Workspace> {
		const result = await this.workspaceModel.findOne({ name });

		if (result) {
			throw new BadRequestException('Workspace already exists');
		} else {
			const newWorkspace = await new this.workspaceModel({ name, token: crypto.randomUUID() }).save();

			try {
				await this.fsService.createWorkspace(newWorkspace.name, rawZip);

				this.endpointService.setupEndpoints([newWorkspace.name]);

				return newWorkspace;
			} catch (e) {
				await newWorkspace.remove();
				throw e;
			}
		}
	}

	@Get('/index-workspace/:name')
	@UseGuards(WorkspaceGuard)
	public async indexWorkspace(@Param('name') name: string): Promise<Directory> {
		const workspace = await this.workspaceModel.findOne({ name });

		return this.fsService.indexWorkspace(workspace.name);
	}

	@Get('/workspace/:name/*')
	@Header('Content-Type', 'text/plain')
	@UseGuards(WorkspaceGuard)
	public async getWorkspaceFile(@Param('name') name: string, @Param('0') path: string): Promise<string> {
		const workspace = await this.workspaceModel.findOne({ name });

		return this.fsService.readFile(workspace.name, path);
	}

	@Patch('/workspace/:name/*')
	@UseGuards(WorkspaceGuard)
	@UseInterceptors(FileInterceptor('file'))
	public async updateWorkspaceFile(@Param('name') name: string, @Param('0') path: string, @UploadedFile() file: Express.Multer.File): Promise<void> {
		const workspace = await this.workspaceModel.findOne({ name });
		let cleanupError = null,
			setupError = null;

		if (this.fsService.isFile(workspace.name, path)) {
			const isEndpoint = path.endsWith('.js');

			if (isEndpoint) {
				try {
					this.endpointService.cleanupEndpoint(workspace.name, path.replace('routes/', ''));
				} catch (e) {
					cleanupError = e;
					console.error(e);
				}
			}
			this.fsService.writeFile(workspace.name, path, file.buffer);
			if (isEndpoint) {
				try {
					this.endpointService.setupEndpoint(workspace.name, path.replace('routes/', ''));
				} catch (e) {
					setupError = e;
					console.error(e);
				}
			}
		}

		if (cleanupError || setupError) {
			throw new InternalServerErrorException({ errors: [cleanupError, setupError].filter((e) => !!e) });
		}
	}

	@Delete('/workspace/:name/*')
	@UseGuards(WorkspaceGuard)
	public async deleteWorkspaceFileOrDir(@Param('name') name: string, @Param('0') path: string, @Query('type') type: 'file' | 'directory'): Promise<void> {
		const workspace = await this.workspaceModel.findOne({ name });

		if (this.fsService.isFile(workspace.name, path) && type === 'file') {
			const isEndpoint = path.endsWith('.js');

			if (isEndpoint) {
				try {
					this.endpointService.cleanupEndpoint(workspace.name, path.replace('routes/', ''));
				} catch (e) {
					console.error(e);
				}
			}

			this.fsService.deleteFile(workspace.name, path);
		} else if (this.fsService.isDirectory(workspace.name, path) && type === 'directory') {
			this.fsService.deleteDirectory(workspace.name, path);
		} else {
			throw new BadRequestException('Invalid path or mismatched file/directory type');
		}
	}

	@Post('/workspace/:name/*')
	@UseGuards(WorkspaceGuard)
	@UseInterceptors(FileInterceptor('file'))
	public async createFileOrDir(
		@Param('name') name: string,
		@Param('0') path: string,
		@Body('type') type: 'file' | 'directory',
		@Body('action') action: 'create' | 'rename' = 'create',
		@UploadedFile() file: Express.Multer.File | undefined,
		@Body('newName') newName?: string
	): Promise<void> {
		if (action === 'create') {
			if (type === 'file') {
				if (file) {
					this.fsService.writeFile(name, path, file.buffer);
				} else {
					this.fsService.writeFile(name, path, '');
				}

				if (path.endsWith('.js')) {
					try {
						this.endpointService.setupEndpoint(name, path.replace('routes/', ''));
					} catch (_) {}
				}
			} else if (type === 'directory') {
				if (file) {
					const zip = new JSZip();
					await zip.loadAsync(file.buffer);

					await this.fsService.unpack(zip, path, (path) => {
						if (path.endsWith('.js')) {
							try {
								this.endpointService.setupEndpoint(name, path.replace('routes/', ''));
							} catch (_) {}
						}
					});
				} else {
					this.fsService.createDirectory(name, path);
				}
			} else {
				throw new BadRequestException('Invalid type (must be "file" or "directory")');
			}
		} else {
			if (newName) {
				if (type === 'file' || type === 'directory') {
					this.fsService.rename(name, path, newName);
				} else {
					throw new BadRequestException('Invalid type (must be "file" or "directory")');
				}
			} else {
				throw new BadRequestException('Missing new name');
			}
		}
	}

	@Post('/upload-files/:name/*')
	@UseGuards(WorkspaceGuard)
	@UseInterceptors(FileInterceptor('files'))
	public async uploadFilesToDir(@Param('name') name: string, @Param('0') path: string, @UploadedFile() rawZip: Express.Multer.File): Promise<void> {
		if (this.fsService.exists(name, path)) {
			const zip = new JSZip();
			await zip.loadAsync(rawZip.buffer);

			if (Object.keys(zip.files).some((file) => file.includes('/'))) {
				throw new BadRequestException('ZIP file should not contain folders');
			} else {
				await Promise.all(
					Object.entries(zip.files).map(async ([file, data]) => {
						this.fsService.writeFile(name, `${path}/${file}`, await data.async('nodebuffer'));
					})
				);
			}
		} else {
			throw new BadRequestException('Directory does not exist');
		}
	}

	@Get('/typedefs')
	@Header('Content-Type', 'text/plain')
	public getTypedefs(): string {
		return fs.readFileSync(this.fsService.constructAssetPath('pub-dev.d.ts')).toString();
	}

	public async onModuleInit(): Promise<void> {
		this.endpointService.setupEndpoints(await this.workspaceModel.find().then((workspaces) => workspaces.map((workspace) => workspace.name)));
	}
}
