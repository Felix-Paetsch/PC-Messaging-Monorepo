import { Effect } from "effect";
import { Address, SerializedAddress } from "../../../messaging/base/address";
import { CommunicationChannel } from "../../../messaging/base/communication_channel";
import { KernelEnv } from "../../../messaging/base/kernel_environment/index";
import { TransmittableMessage, TransmittableMessageT } from "../../../messaging/base/message";
import { log_messages, log_to_address } from "../../../messaging/middleware/logging";
import { Result, ResultPromise } from "../../../messaging/utils/run";
import { PluginEnvironment } from "../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

type IframeInitData = {
    type: 'ck-port-init';
    iframe_address: SerializedAddress;
    kernel_address: SerializedAddress;
}

// ============================
let plugin_initialized = false; // This will be set to false for each new plugin
function listen_to_communication_channel_initialization_message(event: MessageEvent, resolve: (res: Result<{
    channel: CommunicationChannel,
    ownAddress: Address,
    port: MessagePort
}, Error>) => void) {
    if (!(event.data.type === 'ck-port-init' && event.ports && event.ports.length > 0 && !plugin_initialized)) {
        return;
    }

    plugin_initialized = true;
    const port = event.ports[0];
    const data = event.data as IframeInitData;

    // =====================================
    let on_incoming_message = (_message: TransmittableMessage) => { };
    const channel: CommunicationChannel = {
        address: Address.deserialize(data.kernel_address).pipe(Effect.runSync),
        send: Effect.gen(function* () {
            const message = yield* TransmittableMessageT;
            port.postMessage({
                type: 'ck-message',
                serialized_message: message.string
            });
        }),
        recieve_cb: (e) => {
            on_incoming_message = (message) => {
                e.pipe(
                    Effect.provideService(TransmittableMessageT, message),
                    Effect.runPromise
                );
            }
        }
    }
    resolve({
        is_error: false,
        result: {
            channel,
            ownAddress: Address.deserialize(data.iframe_address).pipe(Effect.runSync),
            port
        }
    });

    // ==============================
    port.onmessage = (portEvent: MessageEvent) => {
        const data = portEvent.data;
        if (data.type === 'ck-message' && data.serialized_message) {
            TransmittableMessage.from_unknown(data.serialized_message).pipe(
                Effect.map(message => on_incoming_message(message)),
                Effect.ignore,
                Effect.runPromise
            );
        }
    };

    port.start();
    port.postMessage({
        type: 'ck-successful-init'
    });
}

// ============================
export async function buildIframeEnvironment() {
    const channelPromise = new Promise<Result<{
        channel: CommunicationChannel,
        ownAddress: Address,
        port: MessagePort
    }, Error>>((resolve, reject) => {
        window.addEventListener('message', (event) =>
            listen_to_communication_channel_initialization_message(event, resolve)
        );
    });

    return channelPromise.then(res => {
        if (res.is_error) {
            return res;
        }

        const penv = new PluginEnvironment(
            KernelEnv,
            res.result.ownAddress,
        )

        return {
            is_error: false,
            result: {
                env: penv,
                port: res.result.port
            }
        }
    });
}

export async function initIframePlugin() {
    const res = await buildIframeEnvironment();
    if (res.is_error) {
        return res;
    }

    const {
        env,
        port
    } = res.result;
    env.useMiddleware(log_messages(log_to_address(env.kernel_address)), "monitoring");

    const old_onmessage = port.onmessage;
    port.onmessage = async (portEvent: MessageEvent) => {
        if (portEvent.data.type === 'ck-plugin-init-data') {
            const path = portEvent.data.path as string;

            try {
                const module = await import(path);
                if (module.default && typeof module.default === 'function') {
                    await module.default(env);
                } else {
                    return {
                        is_error: true,
                        error: new Error(`Plugin at path ${path} does not export a default function`)
                    }
                }

                port.postMessage({
                    type: 'ck-successful-init',
                    path: path
                });
            } catch (error) {
                return {
                    is_error: true,
                    error: error
                }
            }
        }
        old_onmessage?.call(port, portEvent);
    };
    port.postMessage({
        type: 'ck-plugin-env-initialized'
    });
}

// ============================
function sendInitMessage(iframe: HTMLIFrameElement, kernel_address: Address, iframe_address: Address, port: MessagePort) {
    iframe.contentWindow?.postMessage({
        type: 'ck-port-init',
        iframe_address: iframe_address.serialize(),
        kernel_address: kernel_address.serialize()
    } as IframeInitData, '*', [port]);
}

export async function buildKernelCommunicationChannel(
    iframe: HTMLIFrameElement, kernel_address: Address, iframe_address: Address
): ResultPromise<CommunicationChannel, Error> {
    return new Promise<Result<CommunicationChannel, Error>>((resolve, reject) => {
        const messageChannel = new MessageChannel();
        const mainPort = messageChannel.port1;
        const iframePort = messageChannel.port2;

        // ==========================

        let on_incoming_message = (_message: TransmittableMessage) => { };
        const on_initialized = () => {
            resolve({
                is_error: false,
                result: {
                    address: kernel_address,
                    send: Effect.gen(function* () {
                        const message = yield* TransmittableMessageT;
                        iframePort.postMessage({
                            type: 'ck-message',
                            serialized_message: message.string
                        });
                    }),
                    recieve_cb: (e) => {
                        on_incoming_message = (message) => {
                            e.pipe(
                                Effect.provideService(TransmittableMessageT, message),
                                Effect.runPromise
                            );
                        }
                    }
                }
            });
        };

        // ==========================

        mainPort.onmessage = (event: MessageEvent) => {
            const data = event.data || {};
            if (data.type === 'ck-message' && data.serialized_message) {
                TransmittableMessage.from_unknown(data.serialized_message).pipe(
                    Effect.map(message => on_incoming_message(message)),
                    Effect.ignore,
                    Effect.runPromise
                );
            } else if (data.type === 'ck-successful-init') {
                on_initialized();
            }
        };
        mainPort.start();

        window.addEventListener('message', (event) => {
            if (event.source === iframe.contentWindow &&
                event.data.type === 'ck-request-init') {
                sendInitMessage(iframe, kernel_address, iframe_address, iframePort);
            }
        });

        iframe.addEventListener('load', () => {
            sendInitMessage(iframe, kernel_address, iframe_address, iframePort);
        });
    });
}