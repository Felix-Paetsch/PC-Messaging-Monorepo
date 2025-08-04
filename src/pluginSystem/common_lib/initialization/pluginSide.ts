import { Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { CommunicationChannel, CommunicationChannelT, registerCommunicationChannel } from "../../../messaging/base/communication_channel";
import { KernelEnv } from "../../../messaging/base/kernel_environment";
import { TransmittableMessage, TransmittableMessageT } from "../../../messaging/base/message";
import { Result } from "../../../messaging/utils/boundary/result";
import { callbackAsEffect, resultToEffect } from "../../../messaging/utils/boundary/run";
import { Json } from "../../../messaging/utils/json";
import { PluginEnvironment } from "../../plugin_lib/plugin_env/plugin_env";
import type { MessageChannel } from "./kernelSide";

type PluginInitializationContext = {
    on_message: Effect.Effect<void, never, TransmittableMessageT>;
    kernelAddress: Address;
    pluginAddress: Address;
    pluginPath: string;
    sendOverPort: (message: Json) => void;
};

export function plugin_initializePlugin(
    port: MessageChannel,
    path_to_exectuable_function: (plugin_path: string) => Promise<Result<(penv: PluginEnvironment) => Promise<void>, Error>>
) {
    const {
        send,
        recieve
    } = port;

    const context: Partial<PluginInitializationContext> = {
        on_message: Effect.void,
        sendOverPort: send
    }

    let recieve_method = (message: Json) => { }
    recieve((message: Json) => recieve_method(message));
    const recieve_cb = (cb: (message: Json) => {}) => recieve_method = cb;

    recieve_cb(data => {
        return Effect.gen(function* () {
            if ((data as any)?.type === "ck-response-init") {
                context.kernelAddress = yield* Address.deserialize((data as any).value.kernelAddress);
                context.pluginAddress = yield* Address.deserialize((data as any).value.pluginAddress);
                context.pluginPath = (data as any).value.pluginPath;
                const fullcontext = context as PluginInitializationContext;

                Address.setLocalAddress(context.pluginAddress);

                const channel = yield* buildChannel(fullcontext);
                yield* registerCommunicationChannel.pipe(
                    Effect.provideService(CommunicationChannelT, channel)
                );

                recieve_cb(data => {
                    return Effect.gen(function* () {
                        if ((data as any)?.type === "ck-message") {
                            TransmittableMessage.from_unknown((data as any)?.value).pipe(
                                Effect.andThen(message => fullcontext.on_message.pipe(
                                    Effect.provideService(TransmittableMessageT, message)
                                )),
                                Effect.runPromise
                            )
                        }
                    }).pipe(
                        Effect.runPromise
                    )
                });

                const penv = new PluginEnvironment(KernelEnv, context.kernelAddress);
                const fnR = yield* callbackAsEffect(path_to_exectuable_function)(fullcontext.pluginPath);
                const fn = yield* resultToEffect(fnR)
                yield* callbackAsEffect(fn)(penv);

                context.sendOverPort?.({
                    type: "ck-plugin-loaded"
                });
            }
        }).pipe(
            Effect.ignore,
            Effect.runPromise
        );
    });

    context.sendOverPort?.({
        type: "ck-request-init"
    });
};

const buildChannel = (context: PluginInitializationContext) => Effect.sync(() => {
    const send: CommunicationChannel['send'] = Effect.gen(function* () {
        const message = (yield* TransmittableMessageT).string;
        context.sendOverPort({
            type: "ck-message",
            value: message
        });
    });

    const recieve_cb: CommunicationChannel['recieve_cb'] = (recieve_effect) => {
        context.on_message = recieve_effect;
    };

    return {
        address: context.kernelAddress.as_generic(),
        send,
        recieve_cb
    } as CommunicationChannel;
});