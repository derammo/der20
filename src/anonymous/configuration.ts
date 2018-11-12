import { Options } from 'derlib/options';
import { keyword } from 'derlib/config/parser';
import { SetCommand, setDefaultToken } from './set';
import { RevealCommand } from './reveal';
import { CharacterConfiguration } from './character';
import { ConfigurationChangeHandling } from 'derlib/config/context';

export class Configuration implements ConfigurationChangeHandling {
    // standard plugin options
    @keyword('option')
    options: Options = new Options();

    // name of a character in the journal that will provide its default token image for anonymous tokens
    character: CharacterConfiguration = new CharacterConfiguration('Anonymous');

    // set the selected tokens as anonymous
    set: SetCommand = new SetCommand();

    // reveal the selected tokens' real identites
    reveal: RevealCommand = new RevealCommand();

    // on reset (built in command provided by plugin), clear global state
    handleChange(token: string): void {
        if (token === 'reset') {
            setDefaultToken(undefined);
        }
    }
}
