import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ScraperModule } from './URTWebScraper/scraper.module';

@Module({
	imports: [ScraperModule],
	controllers: [AppController],
	providers: []
})
export class AppModule {}

