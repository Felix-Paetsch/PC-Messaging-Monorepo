import { Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { CommunicationChannel, CommunicationChannelT, registerCommunicationChannel } from "../../../messaging/base/communication_channel";
import { KernelEnv } from "../../../messaging/base/kernel_environment";
import { MessageT, TransmittableMessage, TransmittableMessageT } from "../../../messaging/base/message";
import { Json } from "../../../messaging/utils/json";
import { PluginEnvironment } from "../../../pluginSystem/plugin_lib/plugin_env/plugin_env";
import { registerPortPlugin } from "./registerPorts";

const appContainer = document.getElementById("app");
export default function () {
    return Effect.gen(function* () {
        if (!appContainer) {
            return yield* Effect.die(new Error("Couldn't find app container"));
        }

        const {
            send,
            recieve_cb
        } = yield* registerPortPlugin();

        const context: Partial<CreateIframeContext> = {
            on_message: Effect.void,
            sendOverPort: send
        }

        recieve_cb(data => {
            return Effect.gen(function* () {
                if ((data as any)?.type === "ck-response-init") {
                    context.kernelAddress = yield* Address.deserialize((data as any).value.kernelAddress);
                    context.pluginAddress = yield* Address.deserialize((data as any).value.pluginAddress);
                    context.pluginPath = (data as any).value.pluginPath;
                    const fullcontext = context as CreateIframeContext;

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
                        })
                    });

                    const penv = new PluginEnvironment(KernelEnv, context.kernelAddress);
                    penv.env.useMiddleware(
                        Effect.gen(function* () {
                            const message = yield* MessageT;
                            console.log("Recieving message", message);
                        })
                    );
                    const prom: Promise<void> = import(/* @vite-ignore */ fullcontext.pluginPath).then(module => module.default(penv));
                    yield* Effect.tryPromise({
                        try: () => prom,
                        catch: (error) => {
                            console.error(error);
                            return Effect.void;
                        }
                    });

                    context.sendOverPort?.({
                        type: "ck-plugin-loaded"
                    });
                }
            }).pipe(
                Effect.ignore
            );
        });

        context.sendOverPort?.({
            type: "ck-request-init"
        });
    }).pipe(
        Effect.timeout(10000)
    );
}

type CreateIframeContext = {
    on_message: Effect.Effect<void, never, TransmittableMessageT>;
    kernelAddress: Address;
    pluginAddress: Address;
    pluginPath: string;
    sendOverPort: (message: Json) => void;
};

const buildChannel = (context: CreateIframeContext) => Effect.sync(() => {
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