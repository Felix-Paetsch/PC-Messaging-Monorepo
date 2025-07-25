import { Effect } from "effect";
import { Address } from "../../../../messaging/base/address";
import { EnvironmentT } from "../../../../messaging/base/environment";
import { ProtocolError } from "../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../messaging/utils/json";
import { callbackAsEffect, ResultPromise, runEffectAsPromise } from "../../../../messaging/utils/run";
import { EnvironmentCommunicationHandler } from "../../../common_lib/env_communication/EnvironmentCommunicationHandler";
import { KernelEnvironment } from "../kernel_env";

declare module "../kernel_env" {
    interface KernelEnvironment {
        remove_plugin(address: Address, data: Json): ResultPromise<void, ProtocolError>;
    }
}

export default function (KEV: typeof KernelEnvironment) {
    KEV.prototype.remove_plugin = function (address: Address, data: Json) {
        return Effect.gen(this, function* () {
            yield* yield* this._send_command(
                address,
                "remove_plugin",
                data
            )
        }).pipe(
            Effect.provideService(EnvironmentT, this.env),
            runEffectAsPromise
        );
    }

    KEV.add_plugin_command({
        command: "remove_plugin_self",
        on_command: (communicator: KernelEnvironment, handler: EnvironmentCommunicationHandler, data: Json) => {
            return Effect.gen(communicator, function* () {
                yield* callbackAsEffect(communicator.remove_plugin)(handler.communication_target, data);
                yield* handler.close(null, true);
            }).pipe(Effect.ignore);
        }
    });
}