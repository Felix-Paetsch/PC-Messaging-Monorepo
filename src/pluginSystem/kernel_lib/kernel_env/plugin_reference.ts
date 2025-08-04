import { Effect } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Address } from "../../../messaging/base/address";
import { SequentialError } from "../../../messaging/utils/boundary/errors";
import { ErrorResult, Result, ResultPromise, SuccessResult } from "../../../messaging/utils/boundary/result";
import { callbackAsEffect } from "../../../messaging/utils/boundary/run";
import { PluginIdent } from "../../plugin_lib/plugin_env/plugin_ident";
import { KernelEnvironment } from "./kernel_env";

export class PluginReference {
    public is_removed = false;
    readonly plugin_ident: PluginIdent & { instance_id: string };

    constructor(
        readonly address: Address,
        plugin_ident: PluginIdent,
        readonly kernel: KernelEnvironment,
        readonly on_remove: () => void | Result<void, Error> | ResultPromise<void, Error> | Promise<void>
    ) {
        this.plugin_ident = {
            instance_id: uuidv4(),
            ...plugin_ident
        };
    }

    remove(): ResultPromise<void, SequentialError> {
        if (this.is_removed) return Promise.resolve(
            new ErrorResult(new SequentialError([new Error("Plugin already removed")]))
        );
        this.is_removed = true;

        Effect.all([
            this.kernel._send_remove_plugin_message(this.address, this.plugin_ident),
            callbackAsEffect(this.on_remove)()
        ])

        return Promise.resolve(new SuccessResult(undefined));
    }
}