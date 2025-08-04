import { Schema } from "effect";

export const pluginIdentSchema = Schema.Struct({
    name: Schema.String,
    version: Schema.optional(Schema.String),
    instance_id: Schema.optional(Schema.String),
})

export type PluginInstanceId = string;
export type PluginIdent = Schema.Schema.Type<typeof pluginIdentSchema>;