import { PluginEnvironment } from "../../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

export const start_plugin = async (env: PluginEnvironment) => {
    const res_1 = await env.get_plugin({
        name: "CONTROLS"
    });
    if (res_1.is_error) {
        console.log("[CANT GET PLUGIN]")
        console.log(res_1.error)
        throw res_1.error;
    }
    const mp = res_1.value;
    const res_2 = await mp.bridge();
    if (res_2.is_error) {
        console.log("[CANT GET BRIDGE]")
        console.log(res_2.error)
        throw res_2.error;
    }
    const bridge = res_2.value;
    await bridge.send("I have no mouth");

    bridge.on((data) => {
        console.log(data + ", and I must still scream MAIN");
    });
}