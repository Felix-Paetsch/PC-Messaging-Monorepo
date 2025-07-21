import { Effect } from "effect";
import { Address, LocalAddress } from "../../messaging/base/address";
import { Json } from "../../messaging/utils/json";
import { Result, runEffectAsPromise } from "../../messaging/utils/run";
import { KernelEnvironment } from "../../pluginSystem/kernel_lib/kernel_env/kernel_env";
import { createIframePlugin } from "./create_plugin/kernel_createIframePlugin";

const active_plugins = new Map<Json, Address>();
export class KernelImpl extends KernelEnvironment {
    async get_plugin(plugin_ident: Json) {
        if (plugin_ident === "START") {
            return {
                is_error: false as const,
                result: new LocalAddress("START")
            } as Result<Address, Error>;
        }

        if (active_plugins.has(plugin_ident)) {
            return {
                is_error: false as const,
                result: active_plugins.get(plugin_ident) as Address
            } as Result<Address, Error>;
        }

        if (plugin_ident === "DISPLAY" || plugin_ident === "CONTROLS") {
            const address = new LocalAddress(plugin_ident);
            return createIframePlugin(
                new LocalAddress(plugin_ident),
                this.env.ownAddress,
                `/src/demos/website/plugins/${plugin_ident.toLowerCase()}/${plugin_ident.toLowerCase()}`
            ).pipe(
                Effect.as(address),
                runEffectAsPromise
            );
        }

        return {
            is_error: true as const,
            error: new Error("Plugin not found")
        } as Result<Address, Error>;
    }
}

