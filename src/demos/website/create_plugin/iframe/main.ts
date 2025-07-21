import { Effect } from "effect";
import plugin_createIframePlugin from "../plugin_createIframePlugin";

plugin_createIframePlugin().pipe(
    Effect.runPromise
);