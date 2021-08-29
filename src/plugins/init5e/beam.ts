import { Der20Token, Failure, ParserContext, Result, SelectedTokensCommand, Success } from "der20/library";
import { NewTurnCommand } from "./new_turn_command";

// roll20 API
interface XY { x: number, y: number };
declare function spawnFxBetweenPoints(from: XY, to: XY, style: string, pageId?: string): void;

// utility
class Coordinates implements XY {
    constructor(public x: number = 0, public y: number = 0) { 
        // no code
    }

    static middleOf(token: Der20Token): Coordinates {
        return new Coordinates(
            token.raw.get('left') + token.raw.get('width') / 2, 
            token.raw.get('top') + token.raw.get('height') / 2
        );
    }

    static topLeftOf(token: Der20Token): Coordinates {
        return new Coordinates(
            token.raw.get('left'), 
            token.raw.get('top')
        );
    }

    toString(): string {
        return `{${this.x}, ${this.y}}`;
    }
}

/**
 * draws a beam from the current turn token to the selected tokens
 */
export class BeamCommand extends SelectedTokensCommand {
    constructor(private turns: NewTurnCommand) {
        super();
    }
    
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, text: string, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        let from: Coordinates;
        let to: Coordinates;

        if (text.trim().length > 0) {
            return new Failure(new Error('command does not take arguments')).resolve();
        }

        if (this.turns.currentToken === undefined) {
            return new Failure(new Error('no current turn token to use as origin of beam')).resolve();
        }
        
        // draw the line, apparently effects are offset, so we don't center it
        from = Coordinates.topLeftOf(this.turns.currentToken);
        to = Coordinates.topLeftOf(token);
        spawnFxBetweenPoints(from, to, 'beam-magic', token.raw.get('_pageid'));
        return new Success(`drew an effect from ${from} to ${to}`).resolve();
    }
}