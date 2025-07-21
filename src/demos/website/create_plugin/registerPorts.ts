import { Effect } from "effect";
import { TimeoutException } from "effect/Cause";
import { Json } from "../../../messaging/utils/json";

export function registerPortKernel(iframe: HTMLIFrameElement) {
    return Effect.async<{
        send: (data: Json) => void,
        recieve_cb: (cb: (data: Json) => Effect.Effect<void, never, never>) => void
    }, TimeoutException>((resume) => {
        const { port1: mainPort, port2: iframePort } = new MessageChannel();
        mainPort.start();

        const send = (data: Json) => { mainPort.postMessage(data); }
        const recieve_cb = (cb: (data: Json) => Effect.Effect<void, never, never>) => {
            mainPort.onmessage = (event) => { cb(event.data || {}).pipe(Effect.runPromise); }
        }
        add_port_init_event_listener(iframe, iframePort, () => resume(Effect.succeed({
            send,
            recieve_cb
        })));

        return Effect.never;
    }).pipe(
        Effect.timeout(10000)
    );
}

function add_port_init_event_listener(iframe: HTMLIFrameElement, iframePort: MessagePort, resume: () => void) {
    const listener = (event: MessageEvent) => {
        if (
            event.source === iframe.contentWindow &&
            event.data.type === 'ck-initialization-port-request'
        ) {
            iframe.contentWindow?.postMessage('ck-initialization-port-response', '*', [iframePort]);
            window.removeEventListener('message', listener);
            resume();
        }
    }
    window.addEventListener('message', listener);
    iframe.addEventListener('load', () => {
        iframe.contentWindow?.postMessage('ck-intinialization-callbacks-registered', '*');
    });
}

// ======================

export function registerPortPlugin() {
    return Effect.async<{
        send: (data: Json) => void,
        recieve_cb: (cb: (data: Json) => Effect.Effect<void, never, never>) => void
    }, TimeoutException>((resume) => {
        let pluginPort: MessagePort | null = null;

        const send = (data: Json) => {
            pluginPort!.postMessage(data);
        }

        const recieve_cb = (cb: (data: Json) => Effect.Effect<void, never, never>) => {
            pluginPort!.onmessage = (event) => { cb(event.data || {}).pipe(Effect.runPromise); }
        }

        const initListener = (event: MessageEvent) => {
            if (
                event.source === window.parent &&
                event.data === 'ck-intinialization-callbacks-registered'
            ) {
                window.parent.postMessage({
                    type: 'ck-initialization-port-request'
                }, '*');
                window.removeEventListener('message', initListener);
            }
        };

        const portListener = (event: MessageEvent) => {
            if (
                event.source === window.parent &&
                event.data === 'ck-initialization-port-response' &&
                event.ports && event.ports.length > 0
            ) {
                pluginPort = event.ports[0];
                pluginPort.start();

                window.removeEventListener('message', portListener);
                resume(Effect.succeed({
                    send,
                    recieve_cb
                }));
            }
        };

        window.addEventListener('message', initListener);
        window.addEventListener('message', portListener);

        window.parent.postMessage({
            type: 'ck-initialization-port-request'
        }, '*');
    }).pipe(
        Effect.timeout(10000)
    );
}