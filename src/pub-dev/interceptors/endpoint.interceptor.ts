import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

export type EndpointResponse = {
	status: number;
	data: any;
};

@Injectable()
export class EndpointInterceptor implements NestInterceptor {
	intercept(
		context: ExecutionContext,
		next: CallHandler<string | EndpointResponse>
	): Observable<string | EndpointResponse> | Promise<Observable<string | EndpointResponse>> {
		const res = context.switchToHttp().getResponse() as Response;

		return next.handle().pipe(
			map((responseContent) => {
				if (typeof responseContent === 'string') {
					res.header('Content-Type', 'text/html');
					return responseContent;
				} else {
					res.status(responseContent.status).header('Content-Type', 'application/json');
					return responseContent.data;
				}
			})
		);
	}
}