import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PubDevModule } from './pub-dev/pub-dev.module';
import { StatusesModule } from './statuses/statuses.module';

@Module({
	imports: [StatusesModule, PubDevModule],
	controllers: [AppController]
})
export class AppModule {}
