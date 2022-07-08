import { Controller, Get, Header, Inject, Request } from '@nestjs/common';
import { Request as Req } from 'express';
import { Status, StatusService } from './statuses/statuses.service';

@Controller({
	host: process.env.LOCATION
})
export class AppController {
	constructor(@Inject('StatusService') private statusService: StatusService) {}

	@Get('/')
	@Header('Content-Type', 'text/html')
	public getServerStatus(@Request() req: Req): string {
		console.log(req.hostname);

		return `<html>
				<head>
					<title>Catch-All Server</title>
					<style>
						.status { color: white; padding: 0.15em 0.3em; display: inline-block }
						.status.up { background-color: lime; }
						.status.warn { background-color: yellow; }
						.status.down { background-color: red; }
					</style>
				</head>
				<body>
					<h1>Main Server: <span class="status up">up</span></h1>
					<ul>
						${this.statusService
							.getServerStatuses()
							.map(
								([server, status]) => `<li>
									<h2>${server.replace('Controller', ' Server')}: ${this._toHTML(status)}</h2>
									<ul>
										${this.statusService
											.getHandlerStatuses(server)
											.map(
												([handler, status]) => `<li>
													<h3>${handler}: ${this._toHTML(status)}</h3>
												</li>`
											)
											.join('\n')}
									</ul>
								</li>`
							)
							.join('\n')}
					</ul>
				</body>
			</html>`;
	}

	private _toHTML(status: Status): string {
		switch (status) {
			case 'up':
				return '<span class="status up">up</span>';
			case 'error':
				return '<span class="status warn">errored</span>';
			case 'down':
				return '<span class="status down">down</span>';
			default:
				return `<span class="status down">unknown (${status})</span>`;
		}
	}
}
