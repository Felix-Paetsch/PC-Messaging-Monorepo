import { Effect } from "effect";
import { Address } from "../../../messaging/base/address";
import { Environment, EnvironmentT } from "../../../messaging/base/environment";
import { Middleware } from "../../../messaging/base/middleware";
import { PartitionMiddlewareKeys } from "../../../messaging/middleware/partition";
import { ProtocolError, ProtocolErrorN } from "../../../messaging/protocols/base/protocol_errors";
import { Json } from "../../../messaging/utils/json";
import { registerDefaultEnvironmentMiddleware } from "./default_middleware";
import { EnvironmentCommunicationHandler } from "./EnvironmentCommunicationHandler";
import { EnvironmentCommunicationProtocol } from "./protocol";

type CommandPrefix = "BOTH" | "KERNEL" | "PLUGIN";
type Command = `${CommandPrefix}::${string}`;

export abstract class EnvironmentCommunicator {
    protected command_prefix: CommandPrefix;
    private static classCommands = new Map<Function, {
        [key: Command]: {
            command: Command;
            on_command: (communicator: any, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError, never>;
        }
    }>();

    private partitionMiddleware!: Effect.Effect.Success<ReturnType<typeof registerDefaultEnvironmentMiddleware>>;
    private communication_protocol!: EnvironmentCommunicationProtocol;

    constructor(
        readonly env: Environment
    ) {
        Effect.gen(this, function* () {
            this.partitionMiddleware = yield* registerDefaultEnvironmentMiddleware(env);

            this.communication_protocol = new EnvironmentCommunicationProtocol(this);
            const mw = yield* this.communication_protocol.middleware(env);
            this.partitionMiddleware.listeners.push(mw);
        }).pipe(Effect.runSync);

        this.command_prefix = "BOTH";
    }

    useMiddleware(
        mw: Middleware,
        position: PartitionMiddlewareKeys<typeof this.partitionMiddleware>
    ) {
        return this.partitionMiddleware[position].push(mw);
    }

    _send_command(
        target_address: Address,
        command: string,
        data?: Json,
        timeout?: number
    ): Effect.Effect<
        Effect.Effect<EnvironmentCommunicationHandler, ProtocolErrorN>,
        ProtocolErrorN,
        EnvironmentT
    > {
        return this.communication_protocol.run_command(target_address, this.command_prefix + "::" + command, data, timeout);
    }

    _receive_command(
        command: string,
        data: Json,
        handler: EnvironmentCommunicationHandler
    ): Effect.Effect<void, ProtocolError> {
        const registeredCommand = (this.constructor as typeof EnvironmentCommunicator).get_command(command);
        if (registeredCommand) {
            return registeredCommand.on_command(this, handler, data);
        }

        return Effect.fail(new ProtocolErrorN({
            message: `Unknown command: ${command}`,
            data: { command, data }
        }));
    }

    private static _initializeClassCommands(classConstructor: Function): void {
        if (!EnvironmentCommunicator.classCommands.has(classConstructor)) {
            EnvironmentCommunicator.classCommands.set(classConstructor, {});
        }
    }

    private static add_command<T extends EnvironmentCommunicator = EnvironmentCommunicator>(command: {
        command: string;
        on_command: (communicator: T, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    }): void {
        EnvironmentCommunicator._initializeClassCommands(this);
        const classCommandMap = EnvironmentCommunicator.classCommands.get(this)!;
        if (!command.command.startsWith("PLUGIN::") && !command.command.startsWith("KERNEL::")) {
            command.command = "BOTH::" + command.command;
        }
        const cmd = command.command as any;
        classCommandMap[cmd] = command as any;
    }

    static add_kernel_command<T extends EnvironmentCommunicator = EnvironmentCommunicator>(command: {
        command: string;
        on_command: (communicator: T, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    }) {
        return this.add_command({
            command: "KERNEL::" + command.command,
            on_command: command.on_command
        });
    }

    static add_plugin_command<T extends EnvironmentCommunicator = EnvironmentCommunicator>(command: {
        command: string;
        on_command: (communicator: T, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    }) {
        return this.add_command({
            command: "PLUGIN::" + command.command,
            on_command: command.on_command
        });
    }

    static get_command(prefixCommand: string): {
        command: Command;
        on_command: (communicator: EnvironmentCommunicator, handler: EnvironmentCommunicationHandler, data: Json) => Effect.Effect<void, ProtocolError>;
    } | undefined {
        const cmd = prefixCommand as Command;
        let currentClass: Function = this;
        while (currentClass && currentClass !== Function.prototype) {
            const classCommandMap = EnvironmentCommunicator.classCommands.get(currentClass);
            if (classCommandMap) {
                if (classCommandMap[cmd]) {
                    return classCommandMap[cmd];
                }

                if (cmd.startsWith("PLUGIN::") || cmd.startsWith("KERNEL::")) {
                    const commandPart = cmd.split("::", 2)[1];
                    const bothCommand = `BOTH::${commandPart}`;
                    if (classCommandMap[bothCommand as any]) {
                        return classCommandMap[bothCommand as any];
                    }
                }
            }
            currentClass = Object.getPrototypeOf(currentClass);
        }
        return undefined;
    }

    static get commands() {
        EnvironmentCommunicator._initializeClassCommands(this);
        const classCommandMap = EnvironmentCommunicator.classCommands.get(this)!;
        return Object.values(classCommandMap);
    }
}