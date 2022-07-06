import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import { WorkspaceGuard } from './guards/workspace.guard';
import { PubDevController } from './pub-dev.controller';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { EndpointDBService } from './services/endpoint-db.service';
import { EndpointService } from './services/endpoint.service';
import { FilesystemService } from './services/filesystem.service';

beforeAll(() => {
	config({ path: './.env' });
});

describe('PubDevController', () => {
	let controller: PubDevController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PubDevController],
			imports: [
				MongooseModule.forRootAsync({
					useFactory: () => ({
						uri: process.env.MONGODB_URL!
					})
				}),
				MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }])
			],
			providers: [WorkspaceGuard, FilesystemService, EndpointService, EndpointDBService]
		}).compile();

		controller = module.get<PubDevController>(PubDevController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
