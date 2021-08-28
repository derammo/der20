import { config, Options } from 'der20/library';
import { keyword } from 'der20/library';
import { SetCommand, setDefaultToken } from './set';
import { RevealCommand } from './reveal';
import { CharacterConfiguration } from './character';
import { ConfigurationChangeHandling } from 'der20/library';
import { WhisperConfiguration } from './whisper';

export class Configuration implements ConfigurationChangeHandling {
    // standard plugin options
    @keyword('option')
    @config options: Options = new Options();

    // name of a character in the journal that will provide its default token image for anonymous tokens
    @config character: CharacterConfiguration = new CharacterConfiguration('Anonymous');

    // should whisper rolls be set/unset?
    @config whisper: WhisperConfiguration = new WhisperConfiguration();
    
    // set the selected tokens as anonymous
    @config set: SetCommand = new SetCommand(this.whisper);

    // reveal the selected tokens' real identites
    @config reveal: RevealCommand = new RevealCommand(this.whisper);

    // on reset (built in command provided by plugin), clear global state
    handleChange(token: string): Promise<void> {
        if (token === 'reset') {
            setDefaultToken(undefined);
        }
        return Promise.resolve();
    }
}
