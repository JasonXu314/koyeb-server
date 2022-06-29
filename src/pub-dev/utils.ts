import { Request } from 'express';

export type Method = 'get' | 'post' | 'put' | 'del' | 'patch';

export function getToken(req: Request): string {
	return req.cookies[`token:${req.params.name}`] || req.body.token || req.query.token;
}

export function transformMethod(method: string): Method {
	if (method === 'DELETE') {
		return 'del';
	} else {
		return method.toLowerCase() as Method;
	}
}
