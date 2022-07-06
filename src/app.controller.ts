import { Controller, Get, Header } from '@nestjs/common';
import { Status, StatusService } from './statuses.service';

@Controller()
export class AppController {
	constructor(private statusService: StatusService) {}

	@Get('/')
	@Header('Content-Type', 'text/html')
	public getServerStatus(): string {
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
