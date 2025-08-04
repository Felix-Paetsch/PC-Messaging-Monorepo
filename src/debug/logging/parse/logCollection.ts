import { Address } from "../../../messaging/base/address";
import { Message, MessageT } from "../../../messaging/base/message";
import { MessageLog } from "../format";
import { LogEntry } from "./logEntry";
import type LogInvestigator from "./logInverstigator";

export class LogCollection {
    constructor(
        readonly investigator: LogInvestigator,
        readonly logs: LogEntry[]
    ) { }

    to_array(): MessageLog[] {
        return this.logs.map(log => log.log);
    }

    to_string(): string {
        return JSON.stringify(this.to_array(), null, 2);
    }

    push(...logs: LogEntry[]) {
        this.logs.push(...logs);
    }

    filter(predicate: (log: LogEntry) => boolean): LogCollection {
        return new LogCollection(this.investigator, this.logs.filter(predicate));
    }

    from(a: Address) {
        return this.filter(log => log.meta_data.address === a);
    }

    to(a: Address) {
        return this.filter(log => log.meta_data.address === a);
    }

    errors() {

    }

    no_errors() {

    }

    first_of_chain(ident: string | MessageT | MessageLog) {
    }

    uses_protocol(protocol: string): LogCollection {
        return this.filter(log => log.meta_data.protocol === protocol);
    }

    message_chain(ident: string | Message | MessageLog): LogCollection {
        let strIdent: string | null = null;
        if (typeof ident === "string") {
            strIdent = ident;
        } else {
            strIdent = ident.meta_data.chain_message?.msg_chain_uid ?? null;
        }

        return this.investigator.filter((log: LogEntry) => {
            return log.meta_data.chain_message?.msg_chain_uid === strIdent;
        });
    }

    custom_logs() { }
}