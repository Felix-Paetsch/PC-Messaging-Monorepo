import { Effect, Schema } from "effect";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { Address } from "../../../messaging/base/address";
import { MessageT } from "../../../messaging/base/message";
import { Middleware } from "../../../messaging/base/middleware";
import { log_messages, log_to_address, recieveMessageLogs } from "../../../messaging/middleware/logging";
import { MessageLogToJson, MessageToLog } from "../format";

// Compute __dirname equivalent for ES modules 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function kernelDebugLogging(logPath: string = "logs.log"): Middleware {
    const logFile = path.join(__dirname, "../logs", logPath);
    console.log("Logging to: " + logFile);

    let logFileCreated = false;
    const createLogFile = Effect.async<void, Error>(resume => {
        fs.writeFile(logFile, "").then(() => {
            logFileCreated = true;
            resume(Effect.succeed(void 0));
        }).catch((e: Error) => {
            resume(Effect.fail(e));
        });
    })

    return recieveMessageLogs(
        Effect.gen(function* () {
            if (!logFileCreated) {
                yield* createLogFile;
            }

            const message = yield* MessageT;
            const logMessage = yield* Schema.decode(MessageToLog)(message);
            const jsonMessage = yield* Schema.encode(MessageLogToJson)(logMessage);
            const logContent = jsonMessage + "\n";

            yield* Effect.tryPromise({
                try: () => fs.appendFile(logFile, logContent),
                catch: (error) => new Error(`Failed to append to log file: ${error}`)
            });
        }).pipe(
            Effect.tapError(e => Effect.logError(e)),
            Effect.ignore
        )
    )
}

export function pluginDebugLogging(kernel_address: Address): Middleware {
    return log_messages(log_to_address(kernel_address))
}