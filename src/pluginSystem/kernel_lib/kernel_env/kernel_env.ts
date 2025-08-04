import { Address } from "../../../messaging/base/address";
import { Environment } from "../../../messaging/base/environment";
import { KernelEnv } from "../../../messaging/base/kernel_environment/index";
import { ErrorResult, ResultPromise, SuccessResult } from "../../../messaging/utils/boundary/result";
import { EnvironmentCommunicator } from "../../common_lib/env_communication/environment_communicator";
import { kernel_initializePlugin, type MessageChannel } from "../../common_lib/initialization/kernelSide";
import { PluginIdent, PluginInstanceId } from "../../plugin_lib/plugin_env/plugin_ident";
import applyGetPluginPrototypeModifier from "./commands/get_plugin";
import applyRemovePluginPrototypeModifier from "./commands/remove_plugin";
import { PluginReference } from "./plugin_reference";

export abstract class KernelEnvironment extends EnvironmentCommunicator {
    private registered_plugins: Map<PluginInstanceId, PluginReference> = new Map();
    constructor(
        readonly env: Environment = KernelEnv
    ) {
        super(env);
        this.command_prefix = "KERNEL";
    }

    get_plugin(plugin_ident: PluginIdent): ResultPromise<PluginReference, Error> {
        if (this.registered_plugins.has(plugin_ident.instance_id!)) {
            return Promise.resolve(
                new SuccessResult(this.registered_plugins.get(plugin_ident.instance_id!)!)
            );
        }
        if (plugin_ident.instance_id) {
            return Promise.resolve(
                new ErrorResult(new Error("Plugin instance id not found"))
            );
        }
        return this.create_plugin(plugin_ident);
    }

    async get_plugin_address(plugin_ident: PluginIdent): ResultPromise<Address, Error> {
        const result = await this.get_plugin(plugin_ident);
        if (result.is_error) {
            return result;
        }
        return new SuccessResult(result.value.address);
    };

    create_plugin(plugin_ident: PluginIdent): ResultPromise<PluginReference, Error> {
        return Promise.resolve(
            new ErrorResult(new Error("Get Plugin Not Implemented"))
        );
    };

    initializePlugin(
        port: MessageChannel,
        address: Address,
        plugin_path: string
    ) {
        return kernel_initializePlugin(port, this.env.ownAddress, address, plugin_path);
    }
}

applyGetPluginPrototypeModifier(KernelEnvironment)
applyRemovePluginPrototypeModifier(KernelEnvironment)