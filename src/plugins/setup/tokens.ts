import { ConfigurationEnumerated, ConfigurationIntermediateNode, format } from 'der20/library';
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
    hp: ConfigurationEnumerated = new ConfigurationEnumerated("rolled", ["rolled", "maximized"]);

    stat: StatCommand = new StatCommand(this.hp);

    reset: TokenResetCommand = new TokenResetCommand();

    @format("[BRIGHT_DISTANCE [dim DIM_EXTRA_DISTANCE]]")
    light: LightCommand = new LightCommand();

    @format("[DISTANCE]")
    darkvision: DarkvisionCommand = new DarkvisionCommand();

    dead: DeadCommand = new DeadCommand();

    dump: DumpCommand = new DumpCommand();
}
