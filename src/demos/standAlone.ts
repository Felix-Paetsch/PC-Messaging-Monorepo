import { Effect } from "effect";
import { Address, LocalAddress } from "../messaging/base/address";
import { createLocalEnvironment } from "../messaging/base/environment";
import { MessageT } from "../messaging/base/message";
import { log_messages, log_to_address, recieveMessageLogs } from "../messaging/middleware/logging";
import { Json } from "../messaging/utils/json";
import { callbackAsEffect, Result } from "../messaging/utils/run";
import { KernelEnvironment } from "../pluginSystem/kernel_lib/kernel_env/kernel_env";
import { Bridge } from "../pluginSystem/plugin_lib/message_partners/bridge/bridge";
import { MessagePartner } from "../pluginSystem/plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../pluginSystem/plugin_lib/plugin_env/plugin_env";

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
    const res_1 = await env.get_plugin("side", "some data");
    if (res_1.is_error) {
        throw res_1.error;
    }
    const mp = res_1.result;
    const res_2 = await mp.bridge();
    if (res_2.is_error) {
        throw res_2.error;
    }
    const bridge = res_2.result;
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
            env.useMiddleware(log_messages(log_to_address(kernel_address)), "monitoring");
            return callbackAsEffect(plugin)(env)
        }),
        Effect.runPromise
    )
}

const kernel_address = new LocalAddress("__kernel");
const main_address = new LocalAddress("main");
const side_address = new LocalAddress("side");

class KernelImpl extends KernelEnvironment {
    async get_plugin(plugin_ident: Json) {
        if (plugin_ident === "side") {
            await runLocalPlugin(side_plugin, side_address);
            return {
                is_error: false as const,
                result: side_address
            } as Result<Address, Error>;
        }

        return {
            is_error: true as const,
            error: new Error("Plugin not found")
        } as Result<Address, Error>;
    }
}

createLocalEnvironment(kernel_address).pipe(
    Effect.tap(env =>
        env.useMiddleware(recieveMessageLogs(
            Effect.gen(function* () {
                const message = yield* MessageT;
                const content = yield* message.content;
                const meta_data = message.meta_data;
                console.log(content, meta_data);
            }).pipe(Effect.ignore)
        ))
    ),
    Effect.andThen(env => new KernelImpl(env)),
    Effect.runSync
)
runLocalPlugin(main_plugin, main_address);