import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const Method = createParamDecorator((_: string, ctx: ExecutionContext) => {
	const req = ctx.switchToHttp().getRequest() as Request;

	return req.method;
});
