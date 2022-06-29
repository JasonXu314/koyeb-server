import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { Workspace, WorkspaceDocument } from '../schemas/workspace.schema';
import { getToken } from '../utils';

@Injectable()
export class WorkspaceGuard implements CanActivate {
	constructor(@InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>) {}

	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		const req = context.switchToHttp().getRequest() as Request,
			name = req.params.name;

		if (!name) {
			return true;
		}

		const token = getToken(req);

		if (!token) {
			throw new UnauthorizedException('Missing token');
		} else {
			return this.workspaceModel.findOne({ name }).then((workspace) => {
				if (workspace) {
					if (workspace.token === token) {
						return true;
					} else {
						throw new UnauthorizedException('Incorrect token');
					}
				} else {
					throw new NotFoundException('Workspace does not exist');
				}
			});
		}
	}
}
