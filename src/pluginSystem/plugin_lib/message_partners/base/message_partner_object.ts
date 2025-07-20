import { Context, Data, Effect, Option, ParseResult, pipe, Schema } from "effect";
import { EnvironmentT } from "../../../../messaging/base/environment";
import { ProtocolError, ProtocolErrorR } from "../../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../../messaging/utils/json";
import { MessagePartner } from "../message_partner/message_partner";
import { MPOCommunicationHandler } from "./mpo_commands/mpo_communication/MPOCommunicationHandler";
import { MPOCommunication } from "./mpo_commands/mpo_communication/protocol";
import applyPingPrototypeModifier from "./mpo_commands/ping";
import applyRemovePrototypeModifier from "./mpo_commands/remove";

export class MPOInitializationError extends Data.TaggedError("MPOInitializationError")<{
    message_partner_uuid: string;
    uuid: string;
    error: Error;
}> { }

export const MessagePartnerObjectIdentStruct = Schema.Struct({
    message_partner_uuid: Schema.String,
    uuid: Schema.String
})

export type MessagePartnerObjectIdent = Schema.Schema.Type<typeof MessagePartnerObjectIdentStruct>;

export class MessagePartnerObject {
    private static classCommands = new Map<Function, {
        [key: string]: {
            command: string;
            on_first_request: (mpo: any, im: MPOCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
        }
    }>();

    constructor(
        readonly message_partner: MessagePartner,
        readonly uuid: string
    ) {
        // The ? is for MessagePartner initialization
        this.message_partner?.register_message_partner_object(this);
    }

    get ident(): MessagePartnerObjectIdent {
        return {
            message_partner_uuid: this.message_partner.uuid,
            uuid: this.uuid
        }
    }

    protected removed: boolean = false;
    is_removed(): boolean {
        return this.removed || this.message_partner.is_removed();
    }

    _send_command(command: string, data?: Json, timeout?: number): Effect.Effect<
        Effect.Effect<MPOCommunicationHandler, ProtocolError>,
        ProtocolError
    > {
        return this._send_first_mpo_message(command, data, timeout)
    }

    _send_first_mpo_message(protocol: string, data?: Json, timeout?: number): Effect.Effect<
        Effect.Effect<MPOCommunicationHandler, ProtocolError>,
        ProtocolError
    > {
        return MPOCommunication.run_mpo(this, protocol, data, timeout).pipe(
            Effect.provideService(EnvironmentT, this.message_partner.env)
        );
    }

    _recieve_mpo_message(protocol_name: string, data: Json, ich: MPOCommunicationHandler): Effect.Effect<void, ProtocolError> {
        const command = (this.constructor as typeof MessagePartnerObject).get_command(protocol_name);
        if (command) {
            return command.on_first_request(this, ich, data);
        }

        return Effect.fail(new ProtocolErrorR({
            message: `Unknown protocol: ${protocol_name}`,
            data: { protocol: protocol_name },
            Message: ich.message
        }));
    }

    static guardCanMakeMPO(mpo: MessagePartnerObject, uuid: string): Effect.Effect<void, MPOInitializationError> {
        return Effect.gen(function* () {
            if (mpo.is_removed()) {
                return yield* new MPOInitializationError({
                    message_partner_uuid: mpo.message_partner.uuid,
                    uuid: uuid,
                    error: new Error("Message partner is no longer active")
                });
            }
            if (Option.isSome(mpo.message_partner.get_message_partner_object(uuid))) {
                return yield* new MPOInitializationError({
                    message_partner_uuid: mpo.message_partner.uuid,
                    uuid: uuid,
                    error: new Error("Uuid already exists on message partner")
                });
            }

            return yield* Effect.void;
        });
    }

    static make<T extends MessagePartnerObject>(
        mpo: MessagePartnerObject,
        uuid: string,
        classConstructor: { new(mpo: MessagePartner, uuid: string): T }
    ): Effect.Effect<T, MPOInitializationError> {
        return pipe(
            this.guardCanMakeMPO(mpo, uuid),
            Effect.andThen(() => Effect.succeed(new classConstructor(mpo.message_partner, uuid)))
        )
    }

    static MessagePartnerObjectFromIdent = Schema.transformOrFail(
        MessagePartnerObjectIdentStruct,
        Schema.instanceOf(MessagePartnerObject),
        {
            encode: (msg_partner_object: MessagePartnerObject, _, __) => Effect.succeed(msg_partner_object.ident),
            decode: (ident: MessagePartnerObjectIdent, _, ast) => Effect.suspend(() => pipe(
                MessagePartner.get_message_partner(ident.message_partner_uuid),
                Effect.mapError(e => new ParseResult.Type(
                    ast, ident, `Couln't find message partner`)
                ),
                Effect.andThen(mpE => mpE),
                Effect.andThen(mp => mp.get_message_partner_object(ident.uuid)),
                Effect.catchTag("NoSuchElementException", e => Effect.fail(new ParseResult.Type(
                    ast, ident, `Couln't find message partner object`)
                ))
            ))
        }
    );

    // COMMANDS
    private static _initializeClassCommands(classConstructor: Function): void {
        if (!MessagePartnerObject.classCommands.has(classConstructor)) {
            MessagePartnerObject.classCommands.set(classConstructor, {});
        }
    }

    static add_command<T extends MessagePartnerObject = MessagePartnerObject>(command: {
        command: string;
        on_first_request: (mpo: T, im: MPOCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    }): void {
        MessagePartnerObject._initializeClassCommands(this);
        const classCommandMap = MessagePartnerObject.classCommands.get(this)!;
        classCommandMap[command.command] = command;
    }

    static get_command(commandName: string): {
        command: string;
        on_first_request: (mpo: any, im: MPOCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    } | undefined {
        let currentClass: Function = this;
        while (currentClass && currentClass !== Function.prototype) {
            const classCommandMap = MessagePartnerObject.classCommands.get(currentClass);
            if (classCommandMap && classCommandMap[commandName]) {
                return classCommandMap[commandName];
            }
            currentClass = Object.getPrototypeOf(currentClass);
        }
        return undefined;
    }

    static get commands() {
        MessagePartnerObject._initializeClassCommands(this);
        const classCommandMap = MessagePartnerObject.classCommands.get(this)!;
        return Object.values(classCommandMap);
    }
}

export class MessagePartnerObjectT extends Context.Tag("MessagePartnerObjectT")<MessagePartnerObjectT, MessagePartnerObject>() { }

applyRemovePrototypeModifier(MessagePartnerObject);
applyPingPrototypeModifier(MessagePartnerObject);