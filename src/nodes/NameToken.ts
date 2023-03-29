import Token from './Token';
import TokenType from './TokenType';

export default class NameToken extends Token {
    constructor(name: string) {
        super(name, TokenType.Name);
    }
}
