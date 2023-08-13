import Token from './Token';
import Sym from './Symbol';

export default class NameToken extends Token {
    constructor(name: string) {
        super(name, Sym.Name);
    }
}
