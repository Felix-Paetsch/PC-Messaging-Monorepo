import { Effect } from "effect";
import { v4 as uuidv4 } from 'uuid';
import { fail_as_protocol_error, ProtocolError } from "../../../../messaging/protocols/base/protocol_errors";
import { callbackAsEffect } from "../../../../messaging/utils/boundary/run";
import { Json } from "../../../../messaging/utils/json";
import { MessagePartnerObject } from "../base/message_partner_object";
import { MPOCommunicationHandler } from "../base/mpo_commands/mpo_communication/MPOCommunicationHandler";
import { MessagePartner } from "./message_partner";

export function createMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    senderClass: { new(mpo: MessagePartner, uuid: string): T },
    command: string,
    data: Json = null
): Effect.Effect<T, ProtocolError> {
    return Effect.gen(function* () {
        const im = yield* yield* messagePartner._send_command(command, data);
        const uuid = im.protocol_data as string;

        if (!uuid || typeof uuid !== "string") return yield* im.errorR({ message: "Expected uuid" });
        const mpo = yield* MessagePartnerObject.make(messagePartner, uuid, senderClass).pipe(
            Effect.mapError(e => im.asErrorR(e))
        );
        // im.onMessageError(mpo.remove());

        // This blocks, instead of giving back control.
        yield* im.awaitResponse("OK");
        const confirmationData = im.protocol_data as string;

        if (confirmationData !== "OK") {
            return yield* im.errorR({
                message: "Did not receive ok confirmation from receiver",
                data: confirmationData
            });
        }

        yield* im.finishExternal();
        return mpo;
    }).pipe(
        fail_as_protocol_error
    )
}

export function receiveMpo<T extends MessagePartnerObject>(
    messagePartner: MessagePartner,
    im: MPOCommunicationHandler,
    receiverClass: { new(mpo: MessagePartner, uuid: string): T },
    cb: (mpo: T) => void
): Effect.Effect<void, ProtocolError> {
    return Effect.gen(function* () {
        const uuid = uuidv4();
        yield* im.awaitResponse(uuid, 1000);
        const okData = im.protocol_data as string;
        if (okData !== "OK") {
            return yield* im.errorR({
                message: "Did not receive ok from sender",
                data: okData
            });
        }

        const mpo_object = yield* MessagePartnerObject.make(messagePartner, uuid, receiverClass).pipe(
            Effect.mapError(e => im.asErrorR(e))
        );

        yield* callbackAsEffect(cb)(mpo_object);
        yield* im.close("OK", true);
    }).pipe(
        fail_as_protocol_error
    )
}