import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { Workspace } from '../schemas/workspace.schema';

@Injectable()
export class CookieInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler<Workspace>): Observable<Workspace> | Promise<Observable<Workspace>> {
		const req = context.switchToHttp().getRequest() as Request,
			res = context.switchToHttp().getResponse() as Response;

		return next.handle().pipe(
			map((workspace) => {
				if (!req.cookies[`token:${workspace.name}`]) {
					const today = new Date();

					res.cookie(`token:${workspace.name}`, workspace.token, {
						expires: new Date(today.getFullYear() + (today.getMonth() === 11 ? 1 : 0), (today.getMonth() + 1) % 12)
					});
				}

				return workspace;
			})
		);
	}
}
