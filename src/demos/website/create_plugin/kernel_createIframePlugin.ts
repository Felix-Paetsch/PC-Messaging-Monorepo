import { Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { kernel_initializePlugin, type MessageChannel } from "../../../pluginSystem/common_lib/initialization/kernelSide";
import { registerPortKernel } from "./registerPorts";
const appContainer = document.getElementById("app");
function createIframe(id: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.src = '/src/demos/website/create_plugin/iframe/iframe.html';

    return iframe;
}

export function createIframePlugin(pluginAddress: Address, kernelAddress: Address, JSpath: string) {
    return Effect.gen(function* () {
        if (!appContainer) {
            return yield* Effect.die(new Error("Couldn't find app container"));
        }

        const iframe = createIframe(pluginAddress.serialize().replace(/\s|:/g, "_"));
        appContainer.appendChild(iframe);

        const c: MessageChannel = yield* registerPortKernel(iframe);
        return yield* kernel_initializePlugin(c, kernelAddress, pluginAddress, JSpath);
    })
}