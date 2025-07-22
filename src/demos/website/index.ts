import { Effect } from "effect";
import { LocalAddress } from "../../messaging/base/address";
import { createLocalEnvironment } from "../../messaging/base/environment";
import { MessageT } from "../../messaging/base/message";
import { recieveMessageLogs } from "../../messaging/middleware/logging";
import { callbackAsEffect } from "../../messaging/utils/run";
import { PluginEnvironment } from "../../pluginSystem/plugin_lib/plugin_env/plugin_env";
import { KernelImpl } from "./kernel";
import { start_plugin } from "./plugins/start/start";
import "./styles/main.css";

// Create Kernel
const kernel_address = new LocalAddress("KERNEL");
createLocalEnvironment(kernel_address).pipe(
    Effect.tap(env =>
        env.useMiddleware(recieveMessageLogs(
            Effect.gen(function* () {
                const message = yield* MessageT;
                const content = yield* message.content;
                const meta_data = message.meta_data;
                console.log({
                    ...(meta_data.chain_message as any),
                    ...(meta_data.protocol as any)
                });
                console.log(content);
            }).pipe(Effect.ignore)
        ))
    ),
    Effect.andThen(env => new KernelImpl(env)),
    Effect.runSync
)

// Run Main Plugin (without boundaries)
const start_address = new LocalAddress("START");
createLocalEnvironment(
    start_address
).pipe(
    Effect.andThen(env => {
        return new PluginEnvironment(env, kernel_address)
    }),
    Effect.andThen(env => {
        // env.useMiddleware(log_messages(log_to_address(kernel_address)), "monitoring");
        return callbackAsEffect(start_plugin)(env)
    }),
    Effect.runPromise
)
