import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import UnknownType from "./UnknownType";
import type Token from "./Token";
import type Node from "./Node";
import type Type from "./Type";

export default class UnknownNameType extends UnknownType<Node> {

    readonly name: Token | undefined;

    constructor(expression: Node, name: Token | undefined, why: Type | undefined) {
        super(expression, why);

        this.name = name;
    }

    getReason(): Translations {
        return {
            eng: this.name === undefined ? "a name wasn't given" : `${this.name.getText()} isn't defined`,
            "😀": `${TRANSLATE} •🤔`
        };
    }

}
