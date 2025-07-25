import { Context, Effect, Option, ParseResult, pipe, Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Address } from "../../../../messaging/base/address";
import { Environment, EnvironmentT } from "../../../../messaging/base/environment";
import { MessagePartnerObject, MPOInitializationError } from "../base/message_partner_object";
import applyBridgePrototypeModifier from "./commands/bridge";

export class MessagePartner extends MessagePartnerObject {
    static message_partners: MessagePartner[] = [];
    static get_message_partner(uuid: string) {
        return Effect.gen(function* () {
            const env = yield* EnvironmentT;
            return Option.fromNullable(MessagePartner.message_partners.find(
                mp => mp.uuid === uuid && !mp.is_removed() && mp.env === env
            ));
        })
    }

    private message_partner_objects: MessagePartnerObject[] = [];

    constructor(
        readonly address: Address,
        readonly env: Environment,
        uuid: string = uuidv4()
    ) {
        super(null as any, uuid);
        (this.message_partner as any) = this;
        MessagePartner.message_partners.push(this);
    }

    is_removed(): boolean {
        return this.removed;
    }

    register_message_partner_object(mpo: MessagePartnerObject) {
        if (!(mpo instanceof MessagePartner)) {
            this.message_partner_objects.push(mpo);
        }
    }

    get_message_partner_object(uuid: string): Option.Option<MessagePartnerObject> {
        if (uuid.charAt(uuid.length - 2) === "_" && uuid.slice(0, -2) === this.uuid.slice(0, -2)) {
            return Option.some(this);
        }
        if (uuid == this.uuid) {
            return Option.some(this);
        }

        return Option.fromNullable(this.message_partner_objects.find(
            mp => mp.uuid === uuid
        ));
    }

    static makeMP = Schema.transformOrFail(
        Schema.Struct({
            address: Schema.instanceOf(Address),
            uuid: Schema.String
        }),
        Schema.instanceOf(MessagePartner),
        {
            encode: (mpo: MessagePartner, _, __) => Effect.succeed({
                address: mpo.address,
                uuid: mpo.uuid
            }),
            decode: ({ uuid, address }, _, ast) => pipe(
                MessagePartner.get_message_partner(uuid),
                Effect.andThen(mpE => mpE), // Option as effect
                Effect.flip,
                Effect.andThen(() => Effect.gen(function* () {
                    const env = yield* EnvironmentT;
                    return new MessagePartner(address, env, uuid);
                })),
                Effect.catchAll(e => {
                    return ParseResult.fail(new ParseResult.Type(ast, { uuid, address }, "Message partner already exists"));
                })
            )
        }
    )

    static fromExistingMessagePartnerObject(mpo: MessagePartnerObject, uuid: string): Effect.Effect<MessagePartner, MPOInitializationError> {
        return Schema.decode(this.makeMP)({
            address: mpo.message_partner.address,
            uuid: uuid
        }).pipe(
            Effect.provideService(EnvironmentT, mpo.message_partner.env),
            Effect.mapError(e => new MPOInitializationError({
                message_partner_uuid: mpo.message_partner.uuid,
                uuid: uuid,
                error: e
            }))
        );
    }

    static makeLocalPair(env1: Environment, env2: Environment, uuid = uuidv4()): Effect.Effect<[MessagePartner, MessagePartner], MPOInitializationError> {
        return Effect.gen(this, function* () {
            for (const mp of this.message_partners) {
                if (mp.uuid === uuid && (mp.env === env1 || mp.env === env2)) {
                    return yield* new MPOInitializationError({
                        message_partner_uuid: uuid,
                        uuid: uuid,
                        error: new Error("Message partners with UUID already exist")
                    })
                }
            }

            return [
                new MessagePartner(env2.ownAddress, env1, uuid),
                new MessagePartner(env1.ownAddress, env2, uuid)
            ] as [MessagePartner, MessagePartner];
        })
    }
}

export class MessagePartnerT extends Context.Tag("MessagePartnerT")<MessagePartnerT, MessagePartner>() { }

// applySignalPrototypeModifier(MessagePartner);
applyBridgePrototypeModifier(MessagePartner);