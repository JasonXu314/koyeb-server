import { Module } from '@nestjs/common';
import { StatusInterceptor } from './status.interceptor';
import { StatusService } from './statuses.service';

@Module({
	providers: [{ provide: 'StatusService', useClass: StatusService }, StatusInterceptor],
	exports: ['StatusService', StatusInterceptor]
})
export class StatusesModule {}
