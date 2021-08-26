import { ConfigurationEnumerated, ConfigurationIntermediateNode, format, config } from 'der20/library';
import { DarkvisionCommand } from './darkvision';
import { DeadCommand } from './dead';
import { DumpCommand } from './dump';
import { LightCommand as LightCommand } from './light';
import { TokenResetCommand } from './reset';
import { StatCommand } from './stat';

/**
 * token commands and associated options
 */
export class TokensConfiguration extends ConfigurationIntermediateNode {
    @config hp: ConfigurationEnumerated = new ConfigurationEnumerated("rolled", ["rolled", "maximized"]);

    @config stat: StatCommand = new StatCommand(this.hp);

    @config reset: TokenResetCommand = new TokenResetCommand();

    @format("[BRIGHT_DISTANCE [dim DIM_EXTRA_DISTANCE]]")
    @config light: LightCommand = new LightCommand();

    @format("[DISTANCE]")
    @config darkvision: DarkvisionCommand = new DarkvisionCommand();

    @config dead: DeadCommand = new DeadCommand();

    @config dump: DumpCommand = new DumpCommand();
}
