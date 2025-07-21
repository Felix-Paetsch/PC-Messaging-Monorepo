import { Bridge } from "../../../../pluginSystem/plugin_lib/message_partners/bridge/bridge";
import { MessagePartner } from "../../../../pluginSystem/plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

export default async function (env: PluginEnvironment) {
    env.on_plugin_request((mp: MessagePartner) => {
        console.log("BBBB");
        mp.on_bridge((bridge: Bridge) => {
            console.log("CCCC");
            bridge.on((data) => {
                console.log("DDDD");
                console.log(data + ", and I must scream SIDE");
            });
            bridge.on_listener_registered(async (bridge) => {
                console.log("EEEE");
                await bridge.send("Here I am");
            });
        })
    });
}