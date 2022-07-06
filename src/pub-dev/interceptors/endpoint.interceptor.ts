import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

export type EndpointResponse = {
	status: number;
	data: any;
	headers: Record<string, string>;
};

@Injectable()
export class EndpointInterceptor implements NestInterceptor {
	intercept(
		context: ExecutionContext,
		next: CallHandler<string | EndpointResponse | StreamableFile>
	): Observable<string | EndpointResponse | StreamableFile> | Promise<Observable<string | EndpointResponse | StreamableFile>> {
		const res = context.switchToHttp().getResponse<Response>();

		return next.handle().pipe(
			map((responseContent) => {
				if (typeof responseContent === 'string') {
					res.header('Content-Type', 'text/html');

					return responseContent;
				} else if (responseContent instanceof StreamableFile) {
					return responseContent;
				} else {
					res.status(responseContent.status).header('Content-Type', 'application/json');

					for (const [key, value] of Object.entries(responseContent.headers)) {
						res.header(key, value);
					}

					return responseContent.data;
				}
			})
		);
	}
}
