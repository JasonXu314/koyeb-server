import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FSService {
	public join(...paths: string[]): string {
		return this.fix(paths.filter((path) => path !== '').join('/')) || '.';
	}

	public normalize(path: string): string {
		const normalized: string[] = [];
		let preceedingPrevs = 0;

		for (const part of path.split('/')) {
			if (part === '..') {
				if (normalized.length > 0) {
					normalized.pop();
				} else {
					preceedingPrevs++;
				}
			} else if (part !== '.') {
				normalized.push(part);
			}
		}

		return this.join(...new Array(preceedingPrevs).fill('..'), ...normalized);
	}

	public resolve(...paths: string[]): string {
		return this.normalize(this.join(this.cwd(), ...paths));
	}

	public readBuffer(path: string): Buffer {
		return fs.readFileSync(this.normalize(path));
	}

	public read(path: string): string {
		return this.readBuffer(path).toString();
	}

	public write(path: string, content: string | Buffer): void {
		fs.writeFileSync(this.normalize(path), content);
	}

	public rm(path: string, options?: fs.RmOptions): void {
		fs.rmSync(this.normalize(path), options);
	}

	public rename(source: string, destination: string): void {
		fs.renameSync(this.normalize(source), this.normalize(destination));
	}

	public exists(path: string): boolean {
		return fs.existsSync(this.normalize(path));
	}

	public mkdir(path: string): void {
		fs.mkdirSync(this.normalize(path));
	}

	public readdir(path: string): string[] {
		return fs.readdirSync(this.normalize(path));
	}

	public stat(path: string): fs.Stats {
		return fs.statSync(this.normalize(path));
	}

	public createReadStream(path: string): fs.ReadStream {
		return fs.createReadStream(this.normalize(path));
	}

	public fix(path: string): string {
		return path.replace(/\\/g, '/');
	}

	public cwd(): string {
		return this.fix(process.cwd());
	}
}
