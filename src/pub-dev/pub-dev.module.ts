import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusesModule } from 'src/statuses/statuses.module';
import { WorkspaceGuard } from './guards/workspace.guard';
import { PubDevViewController } from './pub-dev-view.controller';
import { PubDevController } from './pub-dev.controller';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { EndpointDBService } from './services/endpoint-db.service';
import { EndpointService } from './services/endpoint.service';
import { FilesystemService } from './services/filesystem.service';
import { WSSService } from './services/websocket-server.service';

@Module({
	controllers: [PubDevController, PubDevViewController],
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => ({
				uri: process.env.MONGODB_URL!
			})
		}),
		MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }]),
		StatusesModule
	],
	providers: [WorkspaceGuard, FilesystemService, EndpointService, EndpointDBService, WSSService]
})
export class PubDevModule {}
