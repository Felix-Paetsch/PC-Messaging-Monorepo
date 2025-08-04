import { Effect, Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Address } from "../../../../messaging/base/address";
import { EnvironmentT } from "../../../../messaging/base/environment";
import { ProtocolError, ProtocolErrorN } from "../../../../messaging/protocols/base/protocol_errors";
import { ResultPromise } from "../../../../messaging/utils/boundary/result";
import { callbackAsEffect, CallbackError, runEffectAsPromise } from "../../../../messaging/utils/boundary/run";
import { Json } from "../../../../messaging/utils/json";
import { EnvironmentCommunicationHandler } from "../../../common_lib/env_communication/EnvironmentCommunicationHandler";
import { MessagePartner } from "../../message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../plugin_env";
import { PluginIdent } from "../plugin_ident";

declare module "../plugin_env" {
    interface PluginEnvironment {
        get_plugin(plugin_ident: PluginIdent): ResultPromise<MessagePartner, ProtocolError>
        on_plugin_request(cb: (mp: MessagePartner, data?: Json) => void): void,
        _on_plugin_request: (mp: MessagePartner, data?: Json) => Effect.Effect<void, CallbackError>
    }
}

export default function (PEC: typeof PluginEnvironment) {
    PEC.prototype.get_plugin = function (plugin_ident: PluginIdent): ResultPromise<MessagePartner, ProtocolError> {
        return runEffectAsPromise(
            Effect.gen(this, function* () {
                const handlerE = yield* this._send_command(
                    this.kernel_address,
                    "get_plugin",
                    plugin_ident,
                    1000
                ).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                const handler = yield* handlerE;

                const responseData = handler.protocol_data;
                const pluginAddress = yield* Schema.decodeUnknown(Address.AddressFromString)(responseData);

                const uuid = uuidv4();
                const pluginHandlerE = yield* this._send_command(
                    pluginAddress,
                    "get_plugin",
                    { uuid },
                    1000
                ).pipe(
                    Effect.provideService(EnvironmentT, this.env)
                );

                yield* pluginHandlerE;
                const messagePartner = new MessagePartner(pluginAddress, this.env, uuid);
                return messagePartner;
            }).pipe(
                Effect.mapError(e => new ProtocolErrorN({
                    message: "Failed to get plugin",
                    error: e instanceof Error ? e : new Error(String(e))
                }))
            )
        );
    }

    PEC.prototype._on_plugin_request = function (mp: MessagePartner, data?: Json): Effect.Effect<void, CallbackError> {
        return Effect.void;
    }
    PEC.prototype.on_plugin_request = function (cb: (mp: MessagePartner, data?: Json) => void) {
        this._on_plugin_request = callbackAsEffect(cb);
    }

    PEC.add_plugin_command({
        command: "get_plugin",
        on_command: (communicator: PluginEnvironment, handler: EnvironmentCommunicationHandler, data: Json) => {
            return Effect.gen(communicator, function* () {
                const requestData = data as { uuid?: string } | null;
                const uuid = requestData?.uuid;
                const message_partner = new MessagePartner(handler.communication_target, this.env, uuid);
                yield* this._on_plugin_request(message_partner, data).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Error in plugin request callback",
                        error: e instanceof Error ? e : new Error(String(e))
                    }))
                );
                yield* handler.close({ success: true, partner_created: true }, true).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Failed to close handler",
                        error: new Error(String(e))
                    }))
                );
            });
        }
    });
}