import { PluginEnvironment } from "../../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

export const start_plugin = async (env: PluginEnvironment) => {
    const res_1 = await env.get_plugin("CONTROLS");
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