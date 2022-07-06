import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import { AppController } from './app.controller';
import { PubDevModule } from './pub-dev/pub-dev.module';
import { StatusService } from './statuses.service';

beforeAll(() => {
	config({ path: './.env' });
});

describe('AppController', () => {
	let appController: AppController;

	beforeEach(async () => {
		const app: TestingModule = await Test.createTestingModule({
			imports: [PubDevModule],
			controllers: [AppController],
			providers: [StatusService]
		}).compile();

		appController = app.get<AppController>(AppController);
	});

	describe('root', () => {
		it('should show all statuses as up by default', () => {
			expect(appController.getServerStatus().indexOf('down</span>')).toBe(-1);
		});
	});
});
