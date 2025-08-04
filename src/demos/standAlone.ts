import { Effect } from "effect";
import { kernelDebugLogging, pluginDebugLogging } from "../debug/logging/create/middleware";
import { LocalAddress } from "../messaging/base/address";
import { createLocalEnvironment } from "../messaging/base/environment";
import { ErrorResult, SuccessResult } from "../messaging/utils/boundary/result";
import { callbackAsEffect } from "../messaging/utils/boundary/run";
import { KernelEnvironment } from "../pluginSystem/kernel_lib/kernel_env/kernel_env";
import { PluginReference } from "../pluginSystem/kernel_lib/kernel_env/plugin_reference";
import { Bridge } from "../pluginSystem/plugin_lib/message_partners/bridge/bridge";
import { MessagePartner } from "../pluginSystem/plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../pluginSystem/plugin_lib/plugin_env/plugin_env";
import { PluginIdent } from "../pluginSystem/plugin_lib/plugin_env/plugin_ident";

const side_plugin = async (env: PluginEnvironment) => {
    env.on_plugin_request((mp: MessagePartner) => {
        mp.on_bridge((bridge: Bridge) => {
            bridge.on((data) => {
                console.log(data + ", and I must scream SIDE");
            });
            bridge.on_listener_registered(async (bridge) => {
                await bridge.send("Here I am");
            });
        })
    });
}

const main_plugin = async (env: PluginEnvironment) => {
    const res_1 = await env.get_plugin({
        name: "side",
        version: "1.0.0"
    });
    if (res_1.is_error) {
        throw res_1.error;
    }

    const mp = res_1.value;
    const res_2 = await mp.bridge();
    if (res_2.is_error) {
        throw res_2.error;
    }
    const bridge = res_2.value;

    await bridge.send("I have no mouth");
    bridge.on((data) => {
        console.log(data + ", and I must still scream MAIN");
    });
}

function runLocalPlugin(plugin: (env: PluginEnvironment) => Promise<void>, address: LocalAddress) {
    return createLocalEnvironment(
        new LocalAddress(address.secondary_id)
    ).pipe(
        Effect.andThen(env => {
            return new PluginEnvironment(env, kernel_address)
        }),
        Effect.andThen(env => {
            env.useMiddleware(pluginDebugLogging(kernel_address), "monitoring");
            return callbackAsEffect(plugin)(env)
        }),
        Effect.runPromise
    )
}

const kernel_address = new LocalAddress("__kernel");
const main_address = new LocalAddress("main");
const side_address = new LocalAddress("side");

class KernelImpl extends KernelEnvironment {
    async create_plugin(plugin_ident: PluginIdent) {
        if (plugin_ident.name === "side") {
            await runLocalPlugin(side_plugin, side_address);
            return new SuccessResult(new PluginReference(side_address, plugin_ident, this, () => { }));
        }

        return new ErrorResult(new Error("Plugin not found"));
    }
}

createLocalEnvironment(kernel_address).pipe(
    Effect.tap(env =>
        env.useMiddleware(kernelDebugLogging("logs.log"))
    ),
    Effect.andThen(env => new KernelImpl(env)),
    Effect.runSync
)
runLocalPlugin(main_plugin, main_address);