export class Tokenizer {
    /**
     * returns first word and rest of input text as array of exactly 2 elements
     * 
     * @param text 
     * @returns 
     */
    static tokenizeFirst(text: string) : string[] {
        let clean = text.trim();
        let space = clean.indexOf(' ');
        if (space < 0) {
            return [clean, ''];
        }
        return [clean.substr(0, space), clean.substr(space + 1)];
    }

    /**
     * 
     * returns all words in input text as array of unknown length
     * 
     * @param text
     */
    static tokenize(text: string) : string[] {
        return text.trim().split(' ');
    }
}