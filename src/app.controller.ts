import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class AppController {
	constructor() {}

	@Get('/')
	@Header('Content-Type', 'text/html')
	getHello(): string {
		return `
			<html>
				<head>
					<title>Catch-All Server</title>
				</head>
				<body>
					<h1>Status: up</h1>
				</body>
			</html>
		`;
	}
}

