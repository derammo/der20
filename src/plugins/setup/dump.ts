import { Der20Token, ParserContext, Result, SelectedTokensSimpleCommand, Success } from "der20/library"

export class DumpCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        console.log(`token dump:\n${JSON.stringify(token.raw, null, 2)}`);
        if (token.character !== undefined) {
            console.log(`character dump:\n${JSON.stringify(token.character.raw, null, 2)}`);
            const allAttributes: Attribute[] = findObjs({type: 'attribute', characterid: token.character.raw.id}) as Attribute[];
            allAttributes.sort((left, right) => left.get('name').localeCompare(right.get('name')));
            allAttributes.forEach(attribute => {
                const value = attribute.get('current');
                console.log(`  ${attribute.get('name')} = ${typeof(value)} '${value}' out of '${attribute.get('max')}'`)
            });
        }
        return new Success("printed token properties to console");
    }
}