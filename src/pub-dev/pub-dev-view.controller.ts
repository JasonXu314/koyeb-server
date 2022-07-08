import { All, Body, Controller, Get, HostParam, Param, Query, StreamableFile, UseInterceptors } from '@nestjs/common';
import { StatusInterceptor } from 'src/statuses/status.interceptor';
import { Method } from './decorators/method.decorator';
import { EndpointInterceptor, EndpointResponse } from './interceptors/endpoint.interceptor';
import { EndpointService } from './services/endpoint.service';

@Controller({
	host: `:name.pub-dev.${process.env.LOCATION}`
})
@UseInterceptors(StatusInterceptor)
export class PubDevViewController {
	constructor(private endpointService: EndpointService) {}

	@Get('/')
	@UseInterceptors(EndpointInterceptor)
	public async getProjectIndex<T>(
		@HostParam('name') workspace: string,
		@Method() method: string,
		@Query() query: Record<string, string>,
		@Body() body: T
	): Promise<string | EndpointResponse | StreamableFile> {
		return this.endpointService.evaluateRequest<T>(workspace, '', method, query, body);
	}

	@All('/*')
	@UseInterceptors(EndpointInterceptor)
	public async getProjectEndpoint<T>(
		@HostParam('name') workspace: string,
		@Param('0') path: string,
		@Method() method: string,
		@Query() query: Record<string, string>,
		@Body() body: T
	): Promise<string | EndpointResponse | StreamableFile> {
		return this.endpointService.evaluateRequest<T>(workspace, path, method, query, body);
	}
}

