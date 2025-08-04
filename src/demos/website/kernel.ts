import { LocalAddress } from "../../messaging/base/address";
import { ErrorResult, SuccessResult } from "../../messaging/utils/boundary/result";
import { runEffectAsPromise } from "../../messaging/utils/boundary/run";
import { KernelEnvironment } from "../../pluginSystem/kernel_lib/kernel_env/kernel_env";
import { PluginReference } from "../../pluginSystem/kernel_lib/kernel_env/plugin_reference";
import { PluginIdent } from "../../pluginSystem/plugin_lib/plugin_env/plugin_ident";
import { createIframePlugin } from "./create_plugin/kernel_createIframePlugin";

export class KernelImpl extends KernelEnvironment {
    async create_plugin(plugin_ident: PluginIdent) {
        // Since this runs in the browser currently
        const possible_plugins = ["display", "controls", "start"];
        if (possible_plugins.includes(plugin_ident.name.toLowerCase()) && plugin_ident.name.toUpperCase() === plugin_ident.name) {
            const address = new LocalAddress(plugin_ident.name);
            const result = await createIframePlugin(
                new LocalAddress(plugin_ident.name),
                this.env.ownAddress,
                `/src/demos/website/plugins/${plugin_ident.name.toLowerCase()}/${plugin_ident.name.toLowerCase()}`
            ).pipe(
                runEffectAsPromise
            );
            if (result instanceof ErrorResult) {
                throw result.error;
            }
            return new SuccessResult(
                new PluginReference(
                    address,
                    plugin_ident,
                    this,
                    result.value.remove
                )
            );
        }

        return new ErrorResult(new Error("Plugin not found"));
    }
}

