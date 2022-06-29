import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspaceGuard } from './guards/workspace.guard';
import { PubDevController } from './pub-dev.controller';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { EndpointDBService } from './services/endpoint-db.service';
import { EndpointService } from './services/endpoint.service';
import { FilesystemService } from './services/filesystem.service';

@Module({
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
})
export class PubDevModule {}

