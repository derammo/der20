import { ConfigurationCommand, ParserContext, Result, CommandSource, NotesSource, Der20Token, Failure, ConfigurationParser, Success } from "der20/library";
import { PartyScaling, PartyScalingLength } from "./ddal/party_scaling";
import { ScalingChangeObserver } from "./ddal/party_state";

class TokenScaling {
    // map from party scaling level (including custom values) to flag to mark whether token is present
    present: Record<string, boolean> = {};
}   

// XXX initially get and then cache strength value so we can configure newly added or modified tokens' visibility
export class TokenScalingCommand extends ConfigurationCommand implements ScalingChangeObserver {
    private tokens: Record<string, TokenScaling> = {};

    // most recently received current party strength, to apply to new tokens
    private strength: string = 'Average';

    private parseLevel(line: string): number | undefined {
        // REVISIT for now, just recognize exact spelling
        return (<any>PartyScaling)[line];
    }

    private configureFromToken(line: string, context: ParserContext, source: NotesSource) {
        let scaling: TokenScaling;
        const token = Der20Token.fetch(source.id);
        if (token === undefined) {
            return new Failure(new Error(`configuration received from token which has since been removed`));
        }
        debug.log(`${token.name} has sent '${line}' (firstLine: ${source.firstLine})`);      
        if (source.firstLine) {
            // start a fresh record
            scaling = new TokenScaling();
            this.tokens[source.id] = scaling;
        } else {
            // continue existing record
            scaling = this.tokens[source.id];
            if (scaling === undefined) {
                // this could happen based on even listener timing
                return new Failure(new Error(`ignoring commands from token with id ${source.id} that has been removed since the first line was received`));
            }
        }
        const tokens = ConfigurationParser.tokenizeFirst(line);
        const level = this.parseLevel(tokens[1]);
        if (level === undefined) {
            if (tokens[0] !== '==' && tokens[0] !== '=') {
                // custom levels like 'epic' only allow == and = operator
                return new Failure(new Error(`'${tokens[1]}' does not identify a party scaling level (Very Weak, Weak, Average, Strong, Very Strong); custom levels must use '==' comparison`));
            }
            scaling.present[tokens[1]] = true;
        }
        switch (tokens[0]) {
            case '==':
            case '=':
                scaling.present[PartyScaling[level]] = true;
                break;
            case '<':
                for (let i=0; i<level; i++) {
                    scaling.present[PartyScaling[i]] = true;
                }
                break;
            case '>':
                for (let i=level+1; i<PartyScalingLength; i++) {
                    scaling.present[PartyScaling[i]] = true;
                }
                break;
            case '<=':
                for (let i=0; i<=level; i++) {
                    scaling.present[PartyScaling[i]] = true;
                }
                break;
            case '>=':
                for (let i=level; i<PartyScalingLength; i++) {
                    scaling.present[PartyScaling[i]] = true;
                }
                break;
            default:
                return new Failure(new Error(`'${tokens[0]}' is not a valid comparison operator for party scaling level`));
        }
        // we may draw this token multiple times if it has multiple lines of config, but we won't know the 'last line'
        this.updateGraphic(token, scaling);
        return new Success('updated token scaling for party level');
    }

    parse(line: string, context: ParserContext): Result {
        if (context.source.kind === CommandSource.Kind.Token) {
            // command is in gmnotes of the target token
            return this.configureFromToken(line, context, <NotesSource>context.source);
        }
        return new Failure(new Error('XXX unimplemented'));
    }

    handleStrengthChange(strength: string): void {
        this.strength = strength;
        for (let id of Object.keys(this.tokens)) {
            const scaling = this.tokens[id];
            const token = Der20Token.fetch(id);
            if (token === undefined) {
                // token has been removed from game
                debug.log(`removing token '${id}' from scaling tracking, since it is no longer present in the game`);
                delete this.tokens[id];
                continue;
            }
            this.updateGraphic(token, scaling);
        }
    }

    private updateGraphic(token: Der20Token, scaling: TokenScaling) {
        debug.log(`token '${token.name}' is present at ${JSON.stringify(scaling.present)}`);
        if (scaling.present[this.strength]) {
            // present dynamically
            token.raw.set({ aura2_color: '#00FF00', aura2_radius: '0.4', showplayers_aura2: false });
        }
        else {
            // not present but token has a record, meaning it is dynamically removed
            token.raw.set({ aura2_color: '#FF0000', aura2_radius: '0.4', showplayers_aura2: false });
        }
    }
}
