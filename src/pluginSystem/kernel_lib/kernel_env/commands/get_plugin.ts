import { Effect } from "effect";
import { ProtocolErrorN } from "../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../messaging/utils/json";
import { resultToEffect } from "../../../../messaging/utils/run";
import { EnvironmentCommunicationHandler } from "../../../common_lib/env_communication/EnvironmentCommunicationHandler";
import { KernelEnvironment } from "../kernel_env";

export default function (KEV: typeof KernelEnvironment) {
    KEV.add_plugin_command({
        command: "get_plugin",
        on_command: (communicator: KernelEnvironment, handler: EnvironmentCommunicationHandler, data: Json) => {
            return resultToEffect(communicator.get_plugin(data)).pipe(
                Effect.andThen(address => handler.close(address.serialize(), true)),
                Effect.mapError(e => new ProtocolErrorN({
                    message: "Failed to close handler",
                    error: new Error(String(e))
                }))
            );
        }
    });
}