import { Effect, Schema } from "effect";
import { ProtocolCommunicationHandler } from "../../../messaging/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorR } from "../../../messaging/protocols/base/protocol_errors";
import { ProtocolMessage } from "../../../messaging/protocols/base/protocol_message";
import { Json } from "../../../messaging/utils/json";

export type EnvironmentMessage = ProtocolMessage & {
    data: EnvironmentMessageData;
}

export const EnvironmentMessageDataSchema = Schema.Struct({
    command: Schema.String,
    data: Schema.Any,
    timeout: Schema.optionalWith(Schema.Number, {
        default: () => 0
    })
});

export type EnvironmentMessageData = Schema.Schema.Type<typeof EnvironmentMessageDataSchema>;

export class EnvironmentCommunicationHandler extends ProtocolCommunicationHandler {
    private _data: EnvironmentMessageData;
    constructor(
        protected im: EnvironmentMessage,
    ) {
        super(im);
        this._data = im.data;
    }

    respond(data: Json, timeout?: number) {
        return super.respond(Schema.encodeSync(EnvironmentMessageDataSchema)({
            command: this.data.command,
            data: data,
            timeout: timeout || 0
        }), timeout).pipe(
            Effect.map(pmE => pmE.pipe(
                Effect.andThen(pm => Effect.gen(this, function* () {
                    this._data = yield* Schema.decodeUnknown(EnvironmentMessageDataSchema)(pm.data);
                    this.__current_pm = pm;
                    return pm;
                }).pipe(
                    Effect.mapError(e => new ProtocolErrorR({
                        message: "Invalid environment message",
                        data: pm.data,
                        error: e,
                        Message: pm
                    }))
                ))
            ))
        );
    }

    get data(): EnvironmentMessageData {
        return this._data;
    }

    get command(): string {
        return this.data.command;
    }

    get protocol_data(): Json {
        return this.data.data;
    }

    static fromEnvironmentMessage(im: ProtocolMessage): Effect.Effect<EnvironmentCommunicationHandler, ProtocolError> {
        return Effect.gen(function* () {
            yield* Schema.decodeUnknown(EnvironmentMessageDataSchema)(im.data);
            return new EnvironmentCommunicationHandler(im as any);
        }).pipe(
            Effect.mapError(e => new ProtocolErrorR({
                message: "Invalid environment message",
                data: im.data,
                error: e,
                Message: im
            }))
        );
    }
} 