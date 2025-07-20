import { Effect } from "effect";
import { Address, LocalAddress } from "../../../messaging/base/address";
import { CommunicationChannelT, registerCommunicationChannel } from "../../../messaging/base/communication_channel";
import { Result } from "../../../messaging/utils/run";
import { buildKernelCommunicationChannel } from "./build_communication_channel";

const appContainer = document.getElementById("app");
function createIframe(id: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.src = '/src/demos/website/create_plugin/iframe.html';

    return iframe;
}

export async function createPlugin(plugin_ident: string) {
    if (!appContainer) {
        return {
            is_error: true as const,
            error: new Error("Couldn't find app container")
        } as Result<Address, Error>;
    }

    try {
        const iframe = createIframe(plugin_ident);
        appContainer.appendChild(iframe);

        // Wait for iframe to load before setting up communication
        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve();
        });

        const channel = await buildKernelCommunicationChannel(iframe);

        await Effect.runPromise(
            registerCommunicationChannel.pipe(
                Effect.provideService(
                    CommunicationChannelT,
                    channel
                )
            )
        );

        return {
            is_error: false as const,
            result: new LocalAddress(plugin_ident)
        } as Result<Address, Error>;
    } catch (error) {
        return {
            is_error: true as const,
            error: error instanceof Error ? error : new Error(String(error))
        } as Result<Address, Error>;
    }
}