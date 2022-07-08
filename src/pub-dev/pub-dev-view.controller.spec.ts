import { Test, TestingModule } from '@nestjs/testing';
import { PubDevViewController } from './pub-dev-view.controller';

describe('PubDevViewController', () => {
  let controller: PubDevViewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PubDevViewController],
    }).compile();

    controller = module.get<PubDevViewController>(PubDevViewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
