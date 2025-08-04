import { Effect, Schema } from "effect";
import { MessageT } from "../../../messaging/base/message";
import { recieveMessageLogs } from "../../../messaging/middleware/logging";
import { MessageLog, MessageToLog } from "../format";
import { LogCollection } from "./logCollection";
import { LogEntry } from "./logEntry";

export default class LogInvestigator extends LogCollection {
    constructor(logs: MessageLog[] = []) {
        super(null as any, logs.map(log => new LogEntry(this, log)));
        (this as any).investigator = this;
    }

    middleware() {
        return recieveMessageLogs(
            Effect.gen(this, function* () {
                const message = yield* MessageT;
                const logMessage = yield* Schema.decode(MessageToLog)(message);
                this.push(new LogEntry(this, logMessage));
            }).pipe(
                Effect.tapError(e => Effect.logError(e)),
                Effect.ignore
            )
        )
    }

    static async fromFile(FilePath: string): Promise<LogInvestigator> {
        const fs = await import("fs");
        const path = await import("path");
        const totalFilePath = path.join(process.cwd(), "src/debug/logging/logs", FilePath);
        const logs: string = fs.readFileSync(totalFilePath, "utf8");
        const logLines = logs.split("\n");
        const logMessages = [];
        for (const line of logLines) {
            try {
                const logMessage = JSON.parse(line);
                logMessages.push(logMessage);
            } catch (e) { }
        }
        return new LogInvestigator(logMessages);
    }
}

