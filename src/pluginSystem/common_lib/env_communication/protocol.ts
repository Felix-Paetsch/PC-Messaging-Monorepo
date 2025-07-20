import { Effect, pipe } from "effect";
import { Address } from "../../../messaging/base/address";
import { EnvironmentT } from "../../../messaging/base/environment";
import { ProtocolCommunicationHandlerT } from "../../../messaging/protocols/base/communicationHandler";
import { fail_as_protocol_error, ProtocolError, ProtocolErrorN } from "../../../messaging/protocols/base/protocol_errors";
import { Protocol } from "../../../messaging/protocols/protocol";
import { Json } from "../../../messaging/utils/json";
import { EnvironmentCommunicationHandler } from "./EnvironmentCommunicationHandler";
import { EnvironmentCommunicator } from "./environment_communicator";

export interface EnvironmentCommand {
    command: string;
    data: Json;
    handler: EnvironmentCommunicationHandler;
}

export class EnvironmentCommunicationProtocol extends Protocol<Effect.Effect<EnvironmentCommunicationHandler, ProtocolErrorN>, EnvironmentCommand> {
    constructor(
        private communicator: EnvironmentCommunicator
    ) {
        super("environment_communication", "main", "1.0.0");
    }

    run(): Effect.Effect<Effect.Effect<EnvironmentCommunicationHandler, ProtocolErrorN>, ProtocolError> {
        return Effect.fail(new ProtocolErrorN({
            message: "Use run_command method instead for environment communication"
        }));
    }

    run_command(
        target_address: Address,
        command: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<
        Effect.Effect<EnvironmentCommunicationHandler, ProtocolErrorN>,
        ProtocolErrorN,
        EnvironmentT
    > {
        return Effect.gen(this, function* () {
            const handlerE = yield* this.send_first_message(
                target_address,
                {
                    command,
                    data: data || null,
                    timeout: timeout || 0
                },
                timeout
            );

            const env = yield* EnvironmentT;
            return handlerE.pipe(
                Effect.andThen(handler => EnvironmentCommunicationHandler.fromEnvironmentMessage(handler.__current_pm)),
                Effect.provideService(EnvironmentT, env)
            );
        }).pipe(fail_as_protocol_error);
    }

    get on_first_request(): Effect.Effect<void, ProtocolError, ProtocolCommunicationHandlerT> {
        return pipe(
            ProtocolCommunicationHandlerT,
            Effect.andThen(pch => EnvironmentCommunicationHandler.fromEnvironmentMessage(pch.__current_pm)),
            Effect.andThen(handler => this.on_callback({
                command: handler.command,
                data: handler.protocol_data,
                handler
            }))
        );
    }

    on_callback = (cmd: EnvironmentCommand): Effect.Effect<void, ProtocolError> => {
        return this.communicator._receive_command(cmd.command, cmd.data, cmd.handler);
    }
}
