import { ProtocolError } from "../../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../../messaging/utils/json";
import { EffectAsPromise, ResultPromise } from "../../../../../messaging/utils/run";
import { MPOCommunicationHandler } from "../../base/mpo_commands/mpo_communication/MPOCommunicationHandler";
import { Bridge } from "../../bridge/bridge";
import { createMpo, receiveMpo } from "../create_mpo";
import { MessagePartner } from "../message_partner";

declare module "../message_partner" {
    interface MessagePartner {
        bridge(data?: Json): ResultPromise<Bridge, ProtocolError>,
        on_bridge(cb: (mpo: Bridge, data: Json) => void): void,
        __bridge_cb: (mpo: Bridge, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_bridge";
    MPC.prototype.bridge = function (data: Json = null): ResultPromise<Bridge, ProtocolError> {
        const r = EffectAsPromise(createMpo<Bridge>(
            this,
            Bridge,
            cmd,
            data
        ));
        return r();
    }

    MPC.prototype.on_bridge = function (cb: (mpo: Bridge, data: Json) => void): void {
        this.__bridge_cb = cb;
    }

    MPC.prototype.__bridge_cb = function (mpo: Bridge, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: MPOCommunicationHandler, data: Json) => {
            return receiveMpo<Bridge>(mp, im, Bridge, (mpo) => {
                mp.__bridge_cb(mpo, data);
            })
        }
    });
}