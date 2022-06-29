import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { AppModule } from './app.module';

config({ path: './.env' });

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { cors: { origin: true, credentials: true } });

	app.use(cookieParser());

	await app.listen(5000);
}

bootstrap();

