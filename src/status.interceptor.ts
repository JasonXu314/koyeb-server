import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { StatusService } from './statuses.service';

@Injectable()
export class StatusInterceptor implements NestInterceptor {
	constructor(private statusService: StatusService) {}

	intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
		const res = context.switchToHttp().getResponse<Response>();

		return next.handle().pipe(
			map(() => {
				const server = context.getClass().name,
					handler = context.getHandler().name;

				if (res.statusCode >= 500 && res.statusCode < 600) {
					this.statusService.updateServerStatus(server, 'error');
					this.statusService.updateHandlerStatus(server, handler, 'error');
				} else if (this.statusService.getServerStatus(server) !== 'error') {
					this.statusService.updateServerStatus(server, 'up');
				}

				if (this.statusService.getHandlerStatus(server, handler) !== 'error') {
					this.statusService.updateHandlerStatus(server, handler, 'up');
				}
			})
		);
	}
}
