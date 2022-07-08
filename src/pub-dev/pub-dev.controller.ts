import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Header,
	InternalServerErrorException,
	OnModuleInit,
	Param,
	Patch,
	Post,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import * as fs from 'fs';
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
	public async createWorkspace(@Param('name') name: string): Promise<Workspace> {
		const result = await this.workspaceModel.findOne({ name });

		if (result) {
			throw new BadRequestException('Workspace already exists');
		} else {
			const newWorkspace = await new this.workspaceModel({ name, token: crypto.randomUUID() }).save();

			this.fsService.createWorkspace(newWorkspace.name);

			return newWorkspace;
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
	public async updateWorkspaceFile(@Param('name') name: string, @Param('0') path: string, @Body('file') file: string): Promise<void> {
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
				}
			}
			this.fsService.writeFile(workspace.name, path, file);
			if (isEndpoint) {
				try {
					this.endpointService.setupEndpoint(workspace.name, path.replace('routes/', ''));
				} catch (e) {
					setupError = e;
				}
			}
		}

		if (cleanupError || setupError) {
			throw new InternalServerErrorException({ errors: [cleanupError, setupError].filter((e) => !!e) });
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
