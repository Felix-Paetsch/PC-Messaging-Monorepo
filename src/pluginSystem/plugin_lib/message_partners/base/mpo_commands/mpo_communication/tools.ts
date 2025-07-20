import { Effect, pipe, Schema } from "effect";
import { EnvironmentT } from "../../../../../../messaging/base/environment";
import { ProtocolCommunicationHandlerT } from "../../../../../../messaging/protocols/base/communicationHandler";
import { ProtocolError, ProtocolErrorR } from "../../../../../../messaging/protocols/base/protocol_errors";
import { MessagePartner } from "../../../message_partner/message_partner";
import { MessagePartnerObject, MessagePartnerObjectIdent } from "../../message_partner_object";

export const MessagePartnerNotFoundMessage = "Message partner not found" as const;
export const MessagePartnerObjectNotFoundMessage = "Message partner object not found" as const;
export const MessagePartnerGotRemovedMessage = "Message partner object was removed" as const;

export function get_message_partner(msg_partner_ident: string): Effect.Effect<MessagePartner, ProtocolError, ProtocolCommunicationHandlerT> {
    return pipe(
        MessagePartner.get_message_partner(msg_partner_ident),
        Effect.andThen(mp => mp),
        Effect.catchAll(e => Effect.gen(function* () {
            const ch = yield* ProtocolCommunicationHandlerT;
            return yield* new ProtocolErrorR({
                message: MessagePartnerNotFoundMessage,
                error: e,
                Message: ch.message
            })
        })),
        Effect.provideServiceEffect(EnvironmentT, pipe(
            ProtocolCommunicationHandlerT,
            Effect.andThen(ch => ch.message.environment)
        ))
    )
}

export function get_message_partner_object(msg_partner_ident: MessagePartnerObjectIdent): Effect.Effect<MessagePartnerObject, ProtocolError, ProtocolCommunicationHandlerT> {
    return pipe(
        Schema.decodeUnknown(MessagePartnerObject.MessagePartnerObjectFromIdent)(msg_partner_ident),
        Effect.catchAll(e => Effect.gen(function* () {
            const ch = yield* ProtocolCommunicationHandlerT;
            return yield* ch.errorR({
                message: MessagePartnerObjectNotFoundMessage,
                error: e
            })
        })),
        Effect.provideServiceEffect(EnvironmentT, pipe(
            ProtocolCommunicationHandlerT,
            Effect.andThen(ch => ch.message.environment)
        ))
    )
}

export function guard_mpo_still_active(mpo: MessagePartnerObject): Effect.Effect<MessagePartnerObject, ProtocolErrorR, ProtocolCommunicationHandlerT> {
    return Effect.gen(function* () {
        if (mpo.is_removed()) {
            const ch = yield* ProtocolCommunicationHandlerT;
            return yield* ch.errorR({
                message: MessagePartnerGotRemovedMessage,
                error: new Error(MessagePartnerGotRemovedMessage)
            });
        }

        return mpo;
    })
}