import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PubDevModule } from './pub-dev/pub-dev.module';
import { StatusService } from './statuses.service';

@Module({
	imports: [PubDevModule],
	controllers: [AppController],
	providers: [StatusService]
})
export class AppModule {}
