import { Address } from "../../../messaging/base/address";
import { Environment } from "../../../messaging/base/environment";
import { KernelEnv } from "../../../messaging/base/kernel_environment/index";
import { Json } from "../../../messaging/utils/json";
import { Result } from "../../../messaging/utils/run";
import { EnvironmentCommunicator } from "../../common_lib/env_communication/environment_communicator";
import applyGetPluginPrototypeModifier from "./commands/get_plugin";
import applyRemovePluginPrototypeModifier from "./commands/remove_plugin";

export abstract class KernelEnvironment extends EnvironmentCommunicator {
    constructor(
        readonly env: Environment = KernelEnv
    ) {
        super(env);
        this.command_prefix = "KERNEL";
    }

    get_plugin(plugin_ident: Json): Promise<Result<Address, Error>> {
        return Promise.resolve({
            is_error: true,
            error: new Error("Get Plugin Not Implemented")
        })
    };
}

applyGetPluginPrototypeModifier(KernelEnvironment)
applyRemovePluginPrototypeModifier(KernelEnvironment)