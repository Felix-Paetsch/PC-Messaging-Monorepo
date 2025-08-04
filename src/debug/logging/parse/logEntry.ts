import { MessageLog } from "../format";
import LogInvestigator from "./logInverstigator";

export class LogEntry implements MessageLog {
    readonly content!: MessageLog["content"];
    readonly meta_data!: MessageLog["meta_data"];

    constructor(
        readonly log_investigator: LogInvestigator,
        readonly log: MessageLog
    ) {
        Object.assign(this, log);
    }

    message_chain() {
        return this.log_investigator.message_chain(this.log);
    }

    to_string(): string {
        return JSON.stringify(this.log, null, 2);
    }
}