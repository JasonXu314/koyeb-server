import { All, Body, Controller, Get, Header, NotFoundException, Param, Patch, Query, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { Method } from './decorators/method.decorator';
import { Token } from './decorators/token.decorator';
import { WorkspaceGuard } from './guards/workspace.guard';
import { CookieInterceptor } from './interceptors/cookies.interceptor';
import { EndpointInterceptor, EndpointResponse } from './interceptors/endpoint.interceptor';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { EndpointService } from './services/endpoint.service';
import { Directory, FilesystemService } from './services/filesystem.service';

@Controller('pub-dev')
export class PubDevController {
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
			const newWorkspace = await new this.workspaceModel({ name, token: crypto.randomUUID() }).save();

			if (!fs.existsSync(`./filesystem/${newWorkspace.name}`)) {
				fs.mkdirSync(`./filesystem/${newWorkspace.name}`);

				fs.writeFileSync(
					`./filesystem/${newWorkspace.name}/index.html`,
					fs
						.readFileSync('./assets/pub-dev-template-project/index.html')
						.toString()
						.replace(/PROJECT_NAME/g, newWorkspace.name)
				);
			}

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

		if (this.fsService.isValidResource(workspace.name, path)) {
			this.fsService.writeFile(workspace.name, path, file);
		}
	}

	@Get('/typedefs')
	@Header('Content-Type', 'text/plain')
	public getTypedefs(): string {
		return fs.readFileSync(path.join(process.cwd(), 'assets', 'pub-dev.d.ts')).toString();
	}

	@Get('/:name')
	@UseInterceptors(EndpointInterceptor)
	public getProjectIndex(@Param('name') name: string): string {
		if (this.fsService.isValidResource(name, 'index.html')) {
			return this.fsService.readFile(name, 'index.html');
		} else {
			throw new NotFoundException('Page does not exist');
		}
	}

	@All('/:name/*')
	@UseInterceptors(EndpointInterceptor)
	public async getProjectEndpoint<T>(
		@Param('name') name: string,
		@Param('0') path: string,
		@Method() method: string,
		@Query() query: Record<string, string>,
		@Body() body: T
	): Promise<string | EndpointResponse> {
		if (method === 'GET' && this.fsService.isValidResource(name, `${path}.html`)) {
			return this.fsService.readFile(name, `${path}.html`);
		} else if (method === 'GET' && this.fsService.isValidResource(name, `${path}/index.html`)) {
			return this.fsService.readFile(name, `${path}/index.html`);
		} else if (this.fsService.isValidResource(name, `${path}.js`)) {
			return this.endpointService.evaluateEndpoint<T>(name, `${path}.js`, method, query, body);
		} else {
			throw new NotFoundException('Page does not exist');
		}
	}
}

