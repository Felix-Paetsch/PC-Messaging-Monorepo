import { Effect, pipe, Schema } from "effect";
import { EnvironmentT } from "../../../../../../messaging/base/environment";
import { ProtocolCommunicationHandlerT } from "../../../../../../messaging/protocols/base/communicationHandler";
import { fail_as_protocol_error, ProtocolError, ProtocolErrorN } from "../../../../../../messaging/protocols/base/protocol_errors";
import { Protocol } from "../../../../../../messaging/protocols/protocol";
import { Json } from "../../../../../../messaging/utils/json";
import { MessagePartnerObject } from "../../message_partner_object";
import { MPOCommunicationHandler, MPOMessageProtocolDataSchema } from "./MPOCommunicationHandler";
import { get_message_partner_object } from "./tools";



export class MPOCommunicationProtocol extends Protocol<Effect.Effect<MPOCommunicationHandler, ProtocolErrorN>, MPOCommunicationHandler> {
    constructor() {
        super("message_partner_object_communication", "main", "1.0.0");
    }

    run(): Effect.Effect<Effect.Effect<MPOCommunicationHandler, ProtocolErrorN>, ProtocolError> {
        return Effect.fail(new ProtocolErrorN({
            message: "Use run_mpo method instead for MPO communication"
        }));
    }

    run_mpo(
        mpo: MessagePartnerObject,
        mpo_message_protocol_name: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<
        Effect.Effect<MPOCommunicationHandler, ProtocolErrorN>,
        ProtocolErrorN,
        EnvironmentT
    > {
        return Effect.gen(this, function* () {
            const handlerE = yield* this.send_first_message(
                mpo.message_partner.address,
                Schema.encodeSync(MPOMessageProtocolDataSchema)({
                    mpo_ident: mpo.ident,
                    mpo_message_protocol_name,
                    protocol_data: data
                }), timeout
            )

            const env = yield* EnvironmentT;
            return handlerE.pipe(
                Effect.andThen(handler => MPOCommunicationHandler.fromMPOMessage(handler.__current_pm)),
                Effect.provideService(EnvironmentT, env)
            )
        }).pipe(fail_as_protocol_error)
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolCommunicationHandlerT> {
        return pipe(
            ProtocolCommunicationHandlerT,
            Effect.andThen(pch => MPOCommunicationHandler.fromMPOMessage(pch.__current_pm)),
            Effect.andThen(ich => this.on_callback(ich))
        );
    }

    on_callback = (ch: MPOCommunicationHandler): Effect.Effect<void, never, never> => {
        return Effect.gen(function* () {
            const data = ch.data;
            const mpo = yield* get_message_partner_object(data.mpo_ident).pipe(
                Effect.provideService(ProtocolCommunicationHandlerT, ch)
            );

            yield* mpo._recieve_mpo_message(
                data.mpo_message_protocol_name,
                data.protocol_data,
                ch
            );
        }).pipe(Effect.ignore)
    }
}

export const MPOCommunication = new MPOCommunicationProtocol();