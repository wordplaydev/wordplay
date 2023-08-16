import Token from './Token';
import Sym from './Sym';

export default class NameToken extends Token {
    constructor(name: string) {
        super(name, Sym.Name);
    }
}
