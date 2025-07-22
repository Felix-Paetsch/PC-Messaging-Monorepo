import { Bridge } from "../../../../pluginSystem/plugin_lib/message_partners/bridge/bridge";
import { MessagePartner } from "../../../../pluginSystem/plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

export default async function (env: PluginEnvironment) {
    env.on_plugin_request((mp: MessagePartner) => {
        mp.on_bridge((bridge: Bridge) => {
            bridge.on((data) => {
                console.log(data + ", and I must scream SIDE");
            });
            bridge.on_listener_registered(async (bridge) => {
                await bridge.send("Here I am");
            });
        })
    });
}