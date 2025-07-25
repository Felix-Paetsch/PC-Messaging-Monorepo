import { Effect } from "effect";
import { plugin_initializePlugin } from "../../../pluginSystem/common_lib/initialization/pluginSide";
import { PluginEnvironment } from "../../../pluginSystem/plugin_lib/plugin_env/plugin_env";
import { registerPortPlugin } from "./registerPorts";

const appContainer = document.getElementById("app");
export default function () {
    return Effect.gen(function* () {
        if (!appContainer) {
            return yield* Effect.die(new Error("Couldn't find app container"));
        }

        const port = yield* registerPortPlugin();

        return plugin_initializePlugin(port, path_to_exectuable_function);
    })
}

async function path_to_exectuable_function(plugin_path: string) {
    const module: any = await import(/* @vite-ignore */ plugin_path);
    return {
        is_error: false as const,
        result: module.default as (penv: PluginEnvironment) => Promise<void>
    };
}