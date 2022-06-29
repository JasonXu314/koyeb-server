import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkspaceDocument = Workspace & Document;

@Schema()
export class Workspace {
	@Prop({ unique: true })
	name: string;

	@Prop()
	token: string;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
