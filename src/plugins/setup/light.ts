import { ConfigurationInteger, ConfigurationParser, Der20Token, noconfig, ParserContext, Result, SelectedTokensCommand, Success } from 'der20/library';

export class LightCommand extends SelectedTokensCommand {
    handleTokenCommand(token: Der20Token, text: string, parserContext: ParserContext, tokenIndex: number): Result {
        // reset to defaults
        this.bright.clear();
        this.dim.clear();
        debug.log(`light defaulted to ${this.bright.value()} ${this.dim.value()}`);

        // parse any specified light values
        if (text.length > 0) {
            debug.log(`parsing light spec '${text}'`);
            const tokens = ConfigurationParser.tokenize(text);
            if (tokens.length > 0) {
                const parsingResult = this.bright.parse(tokens[0], parserContext);
                if (!parsingResult.isSuccess) {
                    return parsingResult;
                }
            }
            if (tokens.length > 2 && tokens[1] === "dim") {
                const parsingResult = this.dim.parse(tokens[2], parserContext);                
                if (!parsingResult.isSuccess) {
                    return parsingResult;
                }
            }
            debug.log(`light parameters parsed as ${this.bright.value()} ${this.dim.value()}`);
        }

        const brightRange = this.bright.value();
        const totalRange = this.bright.value() + ((brightRange > 0 || this.dim.hasConfiguredValue()) ? this.dim.value() : 0);
        
        if (totalRange > 0) {
            LightCommand.setLight(token, brightRange, totalRange);
        } else {
            LightCommand.setDefaultsNoLight(token);
        }

        return new Success(`light ${token.name} ${brightRange} ft, dim to ${totalRange} ft`);
    }

    @noconfig
    private bright: ConfigurationInteger = new ConfigurationInteger(20);

    @noconfig
    private dim: ConfigurationInteger = new ConfigurationInteger(20);

    static setLight(token: Der20Token, brightRange: number, totalRange: number) {
        /* eslint-disable @typescript-eslint/naming-convention */
        token.raw.set({
            has_bright_light_vision: true,
            emits_bright_light: true,
            bright_light_distance: brightRange,
            emits_low_light: true,
            low_light_distance: totalRange,
            light_otherplayers: true,
            dim_light_opacity: "0.65",
            lightColor: "transparent"
        });
        /* eslint-enable @typescript-eslint/naming-convention */
    }

    static setDefaultsNoLight(token: Der20Token) {
        /* eslint-disable @typescript-eslint/naming-convention */
        token.raw.set({
            has_bright_light_vision: true,
            emits_bright_light: false,
            bright_light_distance: 0,
            emits_low_light: false,
            low_light_distance: 0,
            light_otherplayers: true,
            dim_light_opacity: "0.65",
            lightColor: "transparent"
        });
        /* eslint-enable @typescript-eslint/naming-convention */
    }
}
