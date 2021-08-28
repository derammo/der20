import { ConfigurationInteger, ConfigurationParser, Der20Token, ParserContext, Result, SelectedTokensCommand, Success } from 'der20/library';

export class DarkvisionCommand extends SelectedTokensCommand {
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, text: string, parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        // reset to defaults
        this.distance.clear();

        let distanceAvailable: Promise<Result> = new Success("use default value").resolve();

        if (text.length > 0) {
            // parse any specified light values
            debug.log(`parsing dark vision spec '${text}'`);
            const tokens = ConfigurationParser.tokenize(text);
            if (tokens.length > 0) {
                distanceAvailable = this.distance.parse(tokens[0], parserContext);
            }
        }

        return distanceAvailable
            .then((result: Result) => {
                if (!result.isSuccess) {
                    // parsing error
                    return result;
                }

                const visionDistance = this.distance.value();
                if (visionDistance > 0) {
                    DarkvisionCommand.setDarkvision(token, visionDistance);
                } else {
                    DarkvisionCommand.setDefaultsNoDarkvision(token);
                }

                return new Success(`dark vision ${token.name} ${visionDistance} ft`);
            });
    }

    private distance: ConfigurationInteger = new ConfigurationInteger(30);

    static setDarkvision(token: Der20Token, visionDistance: number) {
        /* eslint-disable @typescript-eslint/naming-convention */
        token.raw.set({
            has_bright_light_vision: true,
            has_night_vision: true,
            night_vision_distance: visionDistance,
            night_vision_effect: "Nocturnal",
            night_vision_tint: null,
            /* eslint-enable @typescript-eslint/naming-convention */
        });
    }

    static setDefaultsNoDarkvision(token: Der20Token) {
        /* eslint-disable @typescript-eslint/naming-convention */
        token.raw.set({
            has_bright_light_vision: true,
            has_night_vision: false,
            night_vision_distance: 0,
            night_vision_effect: null,
            night_vision_tint: null,
        });
        /* eslint-enable @typescript-eslint/naming-convention */
    }
}
