import { Effect } from "effect";
import { ProtocolError } from "../../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../../messaging/utils/json";
import { MPOCommunicationHandler } from "../../base/mpo_commands/mpo_communication/MPOCommunicationHandler";
import { SignalReciever } from "../../signal/reciever";
import { SignalSender } from "../../signal/sender";
import { createMpo, receiveMpo } from "../create_mpo";
import { MessagePartner } from "../message_partner";

declare module "../message_partner" {
    interface MessagePartner {
        signal(): Effect.Effect<SignalSender, ProtocolError>;
        on_signal(cb: (mpo: SignalReciever, data: Json) => void): void,
        __signal_cb: (mpo: SignalReciever, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_signal";
    MPC.prototype.signal = function (data: Json = null): Effect.Effect<SignalReciever, ProtocolError> {
        return createMpo<SignalReciever>(
            this,
            SignalReciever,
            cmd,
            data
        );
    }

    MPC.prototype.on_signal = function (cb: (mpo: SignalReciever, data: Json) => void): void {
        this.__signal_cb = cb;
    }

    MPC.prototype.__signal_cb = function (mpo: SignalReciever, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: MPOCommunicationHandler, data: Json) => {
            return receiveMpo<SignalReciever>(mp, im, SignalReciever, (mpo) => {
                mp.__signal_cb(mpo, data);
            })
        }
    });
}