import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { Server } from 'http';
import { AppModule } from './app.module';
import { PubDevModule } from './pub-dev/pub-dev.module';
import { WSSService } from './pub-dev/services/websocket-server.service';

config({ path: './.env' });

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { cors: { origin: true, credentials: true } });

	app.use(cookieParser());

	const server: Server = await app.listen(5000);

	app.select(PubDevModule).get(WSSService).useServer(server);
}

bootstrap();

