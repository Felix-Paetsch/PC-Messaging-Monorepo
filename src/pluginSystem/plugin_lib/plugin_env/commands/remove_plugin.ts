import { Effect } from "effect";
import { EnvironmentT } from "../../../../messaging/base/environment";
import { ProtocolErrorN } from "../../../../messaging/protocols/base/protocol_errors";
import { callbackAsEffect } from "../../../../messaging/utils/boundary/run";
import { Json } from "../../../../messaging/utils/json";
import { EnvironmentCommunicationHandler } from "../../../common_lib/env_communication/EnvironmentCommunicationHandler";
import { PluginEnvironment } from "../plugin_env";

declare module "../plugin_env" {
    interface PluginEnvironment {
        remove_self(data?: Json): Promise<void>;
        on_remove(cb: (data: Json) => Promise<void>): void;
        __remove_cb: (data: Json) => Promise<void>;
    }
}

export default function (PEC: typeof PluginEnvironment) {
    PEC.prototype.remove_self = function (data?: Json): Promise<void> {
        return this._send_command(
            this.kernel_address,
            "remove_plugin_self",
            data,
            0
        ).pipe(
            Effect.provideService(EnvironmentT, this.env),
            Effect.as(void 0),
            Effect.runPromise
        );
    }

    PEC.prototype.__remove_cb = function (data: Json): Promise<void> {
        return Promise.resolve();
    }
    PEC.prototype.on_remove = function (cb: (data: Json) => Promise<void>) {
        this.__remove_cb = cb;
    }

    PEC.add_kernel_command({
        command: "remove_plugin",
        on_command: (communicator: PluginEnvironment, handler: EnvironmentCommunicationHandler, data: Json) => {
            return Effect.gen(communicator, function* () {
                yield* callbackAsEffect(communicator.__remove_cb)(data).pipe(
                    Effect.mapError(e => handler.asErrorR(e))
                );
                yield* handler.close({ success: true }, true).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Failed to close handler",
                        error: new Error(String(e))
                    }))
                );
            });
        }
    });
}