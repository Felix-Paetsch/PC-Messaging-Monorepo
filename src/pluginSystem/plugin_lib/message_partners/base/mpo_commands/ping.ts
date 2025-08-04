import { Effect, Either } from "effect";
import { fail_as_protocol_error } from "../../../../../messaging/protocols/base/protocol_errors";
import { ResultPromise } from "../../../../../messaging/utils/boundary/result";
import { runEffectAsPromise } from "../../../../../messaging/utils/boundary/run";
import { Json } from "../../../../../messaging/utils/json";
import { MessagePartnerObject } from "../message_partner_object";
import { MPOCommunicationHandler } from "./mpo_communication/MPOCommunicationHandler";

declare module "../message_partner_object" {
    interface MessagePartnerObject {
        ping(): ResultPromise<true, Error>;
    }
}

export default function (MPC: typeof MessagePartnerObject) {
    MPC.add_command({
        command: "ping",
        on_first_request: (mp: MessagePartnerObject, ich: MPOCommunicationHandler, data: Json) => {
            return Effect.gen(mp, function* () {
                return yield* ich.respond("PONG");
            }).pipe(
                fail_as_protocol_error
            )
        }
    });

    MPC.prototype.ping = function () {
        return this._send_first_mpo_message("ping").pipe(
            Effect.map(() => Either.right(true as const)),
            Effect.catchAll((error) => Effect.succeed(Either.left(error)))
        ).pipe(
            Effect.andThen(e => e),
            runEffectAsPromise
        )
    }
} 