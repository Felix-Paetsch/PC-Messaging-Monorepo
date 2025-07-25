import { Effect } from "effect";
import { fail_as_protocol_error } from "../../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../../messaging/utils/json";
import { MessagePartnerObject } from "../message_partner_object";
import { MPOCommunicationHandler } from "./mpo_communication/MPOCommunicationHandler";

declare module "../message_partner_object" {
    interface MessagePartnerObject {
        remove(data?: Json): Promise<void>;
        on_remove(cb: (data: Json) => void): void;
        __remove_cb: (data: Json) => void;
    }
}

export default function (MPC: typeof MessagePartnerObject) {
    MPC.add_command({
        command: "remove_mpo",
        on_first_request: (mp: MessagePartnerObject, ich: MPOCommunicationHandler, data: Json) => {
            return Effect.gen(mp, function* () {
                this.removed = true;
                this.__remove_cb(data);
                return yield* ich.respond("OK");
            }).pipe(
                fail_as_protocol_error
            )
        }
    });

    MPC.prototype.on_remove = function (cb: (data: Json) => void) {
        this.__remove_cb = cb;
    }

    MPC.prototype.remove = function (data: Json = null) {
        return Effect.gen(this, function* () {
            this.removed = true;
            return yield* this._send_first_mpo_message("remove_mpo", data);
        }).pipe(
            Effect.ignore,
            Effect.runPromise
        )
    }
}