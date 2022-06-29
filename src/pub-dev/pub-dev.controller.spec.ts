import { Test, TestingModule } from '@nestjs/testing';
import { PubDevController } from './pub-dev.controller';

describe('PubDevController', () => {
  let controller: PubDevController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PubDevController],
    }).compile();

    controller = module.get<PubDevController>(PubDevController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
