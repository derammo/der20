import { ConfigurationInteger, ConfigurationParser, Der20Token, ParserContext, Result, SelectedTokensCommand, Success } from 'der20/library';

export class LightCommand extends SelectedTokensCommand {
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, text: string, parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        // reset to defaults
        this.bright.clear();
        this.dim.clear();
        debug.log(`light defaulted to ${this.bright.value()} ${this.dim.value()}`);

        let brightAvailable: Promise<Result> = new Success("use default value").resolve();
        let dimAvailable: Promise<Result> = new Success("use default value").resolve();

        // parse any specified light values
        if (text.length > 0) {
            debug.log(`parsing light spec '${text}'`);
            const tokens = ConfigurationParser.tokenize(text);
            if (tokens.length > 0) {
                brightAvailable = this.bright.parse(tokens[0], parserContext);
            }
            if (tokens.length > 2 && tokens[1] === "dim") {
                dimAvailable = this.dim.parse(tokens[2], parserContext);                
            }
            debug.log(`light parameters parsed as ${this.bright.value()} ${this.dim.value()}`);
        }

        return brightAvailable
            .then((brightParsed: Result) => {
                if (!brightParsed.isSuccess) {
                    return brightParsed;
                }
                return dimAvailable
                    .then((dimParsed: Result) => {
                        if (!dimParsed.isSuccess) {
                            return dimParsed;
                        }
        
                        const brightRange = this.bright.value();
                        const totalRange = this.bright.value() + ((brightRange > 0 || this.dim.hasConfiguredValue()) ? this.dim.value() : 0);
                        
                        if (totalRange > 0) {
                            LightCommand.setLight(token, brightRange, totalRange);
                        } else {
                            LightCommand.setDefaultsNoLight(token);
                        }
                
                        return new Success(`light ${token.name} ${brightRange} ft, dim to ${totalRange} ft`).resolve();                
                    });
            })
    }

    private bright: ConfigurationInteger = new ConfigurationInteger(20);

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
