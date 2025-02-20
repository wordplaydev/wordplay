import Sym from './Sym';
import Token from './Token';

export default class NameToken extends Token {
    constructor(name: string) {
        super(name, Sym.Name);
    }
}
