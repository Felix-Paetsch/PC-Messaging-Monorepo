import { Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { Environment } from "../../../messaging/base/environment";
import { EnvironmentCommunicator } from "../../common_lib/env_communication/environment_communicator";
import { MPOCommunication } from "../message_partners/base/mpo_commands/mpo_communication/protocol";
import applyGetPluginPrototypeModifier from "./commands/get_plugin";
import applyRemovePluginPrototypeModifier from "./commands/remove_plugin";

export class PluginEnvironment extends EnvironmentCommunicator {
    constructor(
        readonly env: Environment,
        readonly kernel_address: Address
    ) {
        super(env);
        this.command_prefix = "PLUGIN";

        Effect.gen(this, function* () {
            const mw = yield* MPOCommunication.middleware(env);
            this.useMiddleware(mw, "listeners");
        }).pipe(Effect.runSync);
    }
}

applyGetPluginPrototypeModifier(PluginEnvironment)
applyRemovePluginPrototypeModifier(PluginEnvironment)