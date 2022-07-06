import { FilesystemService } from './filesystem.service';

describe('FilesystemService', () => {
	let service: FilesystemService;

	beforeEach(() => {
		service = new FilesystemService();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
