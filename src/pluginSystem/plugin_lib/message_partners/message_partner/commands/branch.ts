import { Effect } from "effect";
import { ProtocolError } from "../../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../../messaging/utils/json";
import { MPOCommunicationHandler } from "../../base/mpo_commands/mpo_communication/MPOCommunicationHandler";
import { createMpo, receiveMpo } from "../create_mpo";
import { MessagePartner } from "../message_partner";

declare module "../message_partner" {
    interface MessagePartner {
        branch(data: Json): Effect.Effect<MessagePartner, ProtocolError>,
        on_branch(cb: (mpo: MessagePartner, data: Json) => void): void,
        __branch_cb: (mpo: MessagePartner, data: Json) => void
    }
}

export default function (MPC: typeof MessagePartner) {
    const cmd = "create_message_partner";
    MPC.prototype.branch = function (data: Json = null): Effect.Effect<MessagePartner, ProtocolError> {
        return createMpo<MessagePartner>(
            this,
            MessagePartnerFactory,
            cmd,
            data
        );
    }

    MPC.prototype.on_branch = function (cb: (mpo: MessagePartner, data: Json) => void): void {
        this.__branch_cb = cb;
    }

    MPC.prototype.__branch_cb = function (mpo: MessagePartner, data: Json): void {
        mpo.remove();
    }

    MPC.add_command({
        command: cmd,
        on_first_request: (mp: MessagePartner, im: MPOCommunicationHandler, data: Json) => {
            return receiveMpo<MessagePartner>(mp, im, MessagePartnerFactory, (mpo) => {
                mp.__branch_cb(mpo, data);
            })
        }
    });
}

const MessagePartnerFactory = class {
    constructor(mpo: MessagePartner, uuid: string) {
        return new MessagePartner(mpo.address, mpo.env, uuid);
    }
} as { new(mpo: MessagePartner, uuid: string): MessagePartner }