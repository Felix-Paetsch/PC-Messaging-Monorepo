import { MessagePartner } from "../../../../pluginSystem/plugin_lib/message_partners/message_partner/message_partner";
import { PluginEnvironment } from "../../../../pluginSystem/plugin_lib/plugin_env/plugin_env";

export const ui_plugin = async (env: PluginEnvironment) => {
    env.on_plugin_request((mp: MessagePartner) => {

    });

    await env.get_plugin("CONTROLS");
}