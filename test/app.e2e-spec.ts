import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

beforeAll(() => {
	config({ path: './.env' });
});

describe('AppController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule]
		}).compile();

		app = moduleFixture.createNestApplication();
		app.use(cookieParser());
		await app.init();
	});

	it('/ (GET)', () => {
		return request(app.getHttpServer())
			.get('/')
			.expect(200)
			.expect('Content-Type', 'text/html; charset=utf-8')
			.expect((res) => {
				expect(res.text.indexOf('down</span>')).toBe(-1);
			});
	});
});
