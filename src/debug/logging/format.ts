import { Effect, ParseResult, Schema } from "effect";
import { Message } from "../../messaging/base/message";

const MessageLogSchema = Schema.Struct({
    content: Schema.Any,
    meta_data: Schema.Record({
        key: Schema.String,
        value: Schema.Any
    })
});

export type MessageLog = Schema.Schema.Type<typeof MessageLogSchema>;
export const MessageToLog = Schema.transformOrFail(Schema.instanceOf(Message), MessageLogSchema, {
    decode: (message, _, ast) => message.content.pipe(
        Effect.andThen(content => {
            return ParseResult.succeed({
                content: content,
                meta_data: message.meta_data
            })
        }),
        Effect.catchAll(() => ParseResult.fail(
            new ParseResult.Type(ast, message, "Couldn't decode content")
        ))
    ),
    encode: (log, _, ast) => ParseResult.fail(new ParseResult.Forbidden(
        ast,
        log.content,
        "Encoding MessageLog back to Message is forbidden."
    ))
});

export const MessageLogToJson = Schema.parseJson(MessageLogSchema);