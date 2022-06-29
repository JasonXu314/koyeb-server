import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PubDevModule } from './pub-dev/pub-dev.module';

@Module({
	imports: [PubDevModule],
	controllers: [AppController],
	providers: []
})
export class AppModule {}

