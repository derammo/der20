import { ConfigurationStep, ConfigurationChooser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { DungeonMaster } from "derlib/ddal/dungeon_master";
import { RenderCommand } from "./show_command";

export class SendCommand extends RenderCommand {
    toJSON() {
        return undefined;
    }

    parse(line: string) {
        this.tryLoad();
        return { error: 'send command is unimplemented' };
    }
}