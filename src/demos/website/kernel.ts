import { Address, LocalAddress } from "../../messaging/base/address";
import { Json } from "../../messaging/utils/json";
import { Result } from "../../messaging/utils/run";
import { KernelEnvironment } from "../../pluginSystem/kernel_lib/kernel_env/kernel_env";
import { createPlugin } from "./create_plugin/create_plugin";

const active_plugins = new Map<Json, Address>();
export class KernelImpl extends KernelEnvironment {
    async get_plugin(plugin_ident: Json) {
        if (plugin_ident === "UI") {
            return {
                is_error: false as const,
                result: new LocalAddress("UI")
            } as Result<Address, Error>;
        }

        if (active_plugins.has(plugin_ident)) {
            return {
                is_error: false as const,
                result: active_plugins.get(plugin_ident) as Address
            } as Result<Address, Error>;
        }

        if (plugin_ident === "DISPLAY" || plugin_ident === "CONTROLS") {
            return await createPlugin(plugin_ident, this.env.ownAddress);
        }

        return {
            is_error: true as const,
            error: new Error("Plugin not found")
        } as Result<Address, Error>;
    }
}

