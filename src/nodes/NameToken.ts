import Token from './Token';
import Symbol from './Symbol';

export default class NameToken extends Token {
    constructor(name: string) {
        super(name, Symbol.Name);
    }
}
