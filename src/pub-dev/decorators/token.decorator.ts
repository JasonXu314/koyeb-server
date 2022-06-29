import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { getToken } from '../utils';

export const Token = createParamDecorator((_: string, ctx: ExecutionContext) => {
	const req = ctx.switchToHttp().getRequest() as Request;

	return getToken(req);
});
