import { Deferred, Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { CommunicationChannel, CommunicationChannelT, registerCommunicationChannel } from "../../../messaging/base/communication_channel";
import { TransmittableMessage, TransmittableMessageT } from "../../../messaging/base/message";
import { Json } from "../../../messaging/utils/json";
import { Promisify } from "../../../messaging/utils/promisify";

export type MessageChannel = {
    send: (data: Json) => void;
    recieve: (cb: (data: Json) => void) => void;
}

type KernelInitializationContext = {
    on_message: Effect.Effect<void, never, TransmittableMessageT>;
    on_remove: Effect.Effect<void, never, never>;
    kernelAddress: Address;
    pluginPath: string;
    pluginAddress: Address;
    sendOverPort: (message: Json) => void;
    plugin_loaded: () => void;
};

export function kernel_initializePlugin(
    port: MessageChannel,
    kernel_address: Address,
    address: Address,
    plugin_path: string
) {
    return Effect.gen(function* () {
        const awaitLoaded = yield* Deferred.make<0>();
        const context: KernelInitializationContext = {
            on_message: Effect.void,
            on_remove: Effect.void,
            kernelAddress: kernel_address,
            pluginPath: plugin_path,
            pluginAddress: address,
            sendOverPort: port.send,
            plugin_loaded: () => Effect.gen(function* () {
                yield* Deferred.succeed(awaitLoaded, 0);
            }).pipe(
                Effect.runSync
            )
        }

        const channel = yield* buildChannel(context);
        yield* registerCommunicationChannel.pipe(
            Effect.provideService(CommunicationChannelT, channel)
        ); // We don't know yet if other side registered the listener. But it will have by the time the plugin as run.

        port.recieve(data => {
            return Effect.gen(function* () {
                if (typeof (data as any)?.type == "string" && (data as any).type in MessageReactions) {
                    return MessageReactions[(data as any).type]((data as any).value as Json, context);
                }
            }).pipe(
                Effect.runPromise
            )
        });

        MessageReactions["ck-request-init"]({}, context);
        yield* Deferred.await(awaitLoaded).pipe(Promisify);
        return {
            "remove": () => context.on_remove.pipe(Effect.runPromise)
        }
    })
}


const MessageReactions: Record<string, (data: any, context: KernelInitializationContext) => void> = {
    "ck-message": (data, context) => {
        TransmittableMessage.from_unknown(data).pipe(
            Effect.andThen(message => context.on_message.pipe(
                Effect.provideService(TransmittableMessageT, message),
                Effect.runPromise
            )),
            Effect.ignore,
            Effect.runPromise
        );
    },
    "ck-request-init": (data, context) => {
        context.sendOverPort({
            type: "ck-response-init",
            value: {
                kernelAddress: context.kernelAddress.serialize(),
                pluginAddress: context.pluginAddress.serialize(),
                pluginPath: context.pluginPath
            }
        });
    },
    "ck-plugin-loaded": (data, context) => {
        context.plugin_loaded();
    }
}

const buildChannel = (context: KernelInitializationContext) => Effect.sync(() => {
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

    const remove_cb: CommunicationChannel['remove_cb'] = (remove_effect) => {
        const old_remove = context.on_remove;
        context.on_remove = old_remove.pipe(Effect.andThen(remove_effect));
    };

    return {
        address: context.pluginAddress,
        send,
        recieve_cb,
        remove_cb
    } as CommunicationChannel;
});