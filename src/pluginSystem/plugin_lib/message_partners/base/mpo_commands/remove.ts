import { Effect } from "effect";
import { fail_as_protocol_error } from "../../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../../messaging/utils/json";
import { MessagePartnerObject } from "../message_partner_object";
import { MPOCommunicationHandler } from "./mpo_communication/MPOCommunicationHandler";

declare module "../message_partner_object" {
    interface MessagePartnerObject {
        remove(): Effect.Effect<void, never, never>;
    }
}

export default function (MPC: typeof MessagePartnerObject) {
    MPC.add_command({
        command: "remove_mpo",
        on_first_request: (mp: MessagePartnerObject, ich: MPOCommunicationHandler, data: Json) => {
            return Effect.gen(mp, function* () {
                this.removed = true;
                return yield* ich.respond("OK");
            }).pipe(
                fail_as_protocol_error
            )
        }
    });

    MPC.prototype.remove = function (): Effect.Effect<void, never, never> {
        return Effect.gen(this, function* () {
            this.removed = true;
            return yield* this._send_first_mpo_message("remove_mpo").pipe(Effect.ignore);
        })
    }
}