import { Effect, Schema } from "effect";
import { Address } from "../../../messaging/base/address";
import { MessageT } from "../../../messaging/base/message";
import { recieveMessageLogs } from "../../../messaging/middleware/logging";
import { MessageLog, MessageToLog } from "../format";

export class LogCollection {
    constructor(
        readonly investigator: LogInvestigator,
        readonly logs: MessageLog[]
    ) { }

    filter(predicate: (log: MessageLog) => boolean): LogCollection {
        return new LogCollection(this.investigator, this.logs.filter(predicate));
    }

    from(a: Address) {
        return this.filter(log => log.meta_data.address === a);
    }
}

export default class LogInvestigator extends LogCollection {
    constructor(readonly logs: MessageLog[] = []) {
        super(null as any, logs);
        (this as any).investigator = this;
    }

    middleware() {
        return recieveMessageLogs(
            Effect.gen(this, function* () {
                const message = yield* MessageT;
                const logMessage = yield* Schema.decode(MessageToLog)(message);
                this.logs.push(logMessage);
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

