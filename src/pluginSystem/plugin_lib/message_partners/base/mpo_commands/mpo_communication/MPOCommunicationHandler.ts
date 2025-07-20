import { Effect, Schema } from "effect";
import { ProtocolCommunicationHandler } from "../../../../../../messaging/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorR } from "../../../../../../messaging/protocols/base/protocol_errors";
import { ProtocolMessage } from "../../../../../../messaging/protocols/base/protocol_message";
import { Json } from "../../../../../../messaging/utils/json";

export type MPOMessage = ProtocolMessage & {
    data: MPOMessageProtocolData
}

export const MPOMessageProtocolDataSchema = Schema.Struct({
    mpo_ident: Schema.Struct({
        message_partner_uuid: Schema.String,
        uuid: Schema.String
    }),
    mpo_message_protocol_name: Schema.String,
    protocol_data: Schema.Any
});

export type MPOMessageProtocolData = Schema.Schema.Type<typeof MPOMessageProtocolDataSchema>;
export class MPOCommunicationHandler extends ProtocolCommunicationHandler {
    constructor(
        protected im: MPOMessage,
    ) {
        super(im);
    }

    respond(data: Json, timeout?: number) {
        return super.respond(Schema.encodeSync(MPOMessageProtocolDataSchema)({
            mpo_ident: this.data.mpo_ident,
            mpo_message_protocol_name: this.data.mpo_message_protocol_name,
            protocol_data: data
        }), timeout).pipe(
            Effect.map(pmE => pmE.pipe(
                Effect.andThen(pm => Effect.gen(this, function* () {
                    yield* Schema.decodeUnknown(MPOMessageProtocolDataSchema)(pm.data);
                    this.__current_pm = pm;
                    return pm;
                }).pipe(
                    Effect.mapError(e => new ProtocolErrorR({
                        message: "Invalid MPO message",
                        data: pm.data,
                        error: e,
                        Message: pm
                    }))
                ))
            ))
        )
    }

    get data(): MPOMessageProtocolData {
        return (this.__current_pm as any).data;
    }

    get protocol_data(): Json {
        return this.data.protocol_data;
    }

    static fromMPOMessage(im: ProtocolMessage): Effect.Effect<MPOCommunicationHandler, ProtocolError> {
        return Effect.gen(function* () {
            yield* Schema.decodeUnknown(MPOMessageProtocolDataSchema)(im.data);
            return new MPOCommunicationHandler(im as any);
        }).pipe(
            Effect.mapError(e => new ProtocolErrorR({
                message: "Invalid MPO message",
                data: im.data,
                error: e,
                Message: im
            }))
        )
    }
}