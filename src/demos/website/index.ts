import { Effect } from "effect";
import LogInvestigator from "../../debug/logging/parse/logInverstigator";
import { LocalAddress } from "../../messaging/base/address";
import { createLocalEnvironment } from "../../messaging/base/environment";
import { resultToEffect } from "../../messaging/utils/boundary/run";
import { KernelImpl } from "./kernel";
import "./styles/main.css";

declare global {
    var logInverstigator: LogInvestigator;
}

Effect.gen(function* () {
    const kernel_address = new LocalAddress("KERNEL");
    const kernel_env = yield* createLocalEnvironment(kernel_address);

    globalThis.logInverstigator = new LogInvestigator();
    yield* kernel_env.useMiddleware(globalThis.logInverstigator.middleware());

    const kernel = new KernelImpl(kernel_env);
    yield* resultToEffect(kernel.start());
}).pipe(Effect.runPromise)