import { Effect, Schema } from "effect";
import { ProtocolErrorN } from "../../../../messaging/protocols/base/protocol_errors";
import { resultToEffect } from "../../../../messaging/utils/boundary/run";
import { Json } from "../../../../messaging/utils/json";
import { EnvironmentCommunicationHandler } from "../../../common_lib/env_communication/EnvironmentCommunicationHandler";

import { pluginIdentSchema } from "../../../plugin_lib/plugin_env/plugin_ident";
import { KernelEnvironment } from "../kernel_env";

export default function (KEV: typeof KernelEnvironment) {
    KEV.add_plugin_command({
        command: "get_plugin",
        on_command: (communicator: KernelEnvironment, handler: EnvironmentCommunicationHandler, data: Json) => {
            return Effect.gen(function* () {
                const plugin_ident = yield* Schema.decodeUnknown(pluginIdentSchema)(data).pipe(
                    Effect.mapError(e => handler.errorR({
                        message: "Failed to decode plugin ident",
                        error: new Error(String(e))
                    }))
                );
                const plugin = yield* resultToEffect(communicator.get_plugin(plugin_ident)).pipe(
                    Effect.mapError(e => handler.errorR({
                        message: "Callback error creating plugin",
                        error: new Error(String(e))
                    }))
                );
                yield* handler.close(plugin.address.serialize(), true).pipe(
                    Effect.mapError(e => new ProtocolErrorN({
                        message: "Failed to close handler",
                        error: new Error(String(e))
                    }))
                );
            })
        }
    });
}