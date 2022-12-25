import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";
import type Node from "../nodes/Node";
import type Token from "../nodes/Token";
import { WRITE } from "../nodes/Translations";

export default class UnclosedDelimiter extends Conflict {

    readonly open: Token;
    readonly node: Node;
    readonly expected: Token;
    
    constructor(node: Node, open: Token, expected: Token) { 
        super(true);

        this.open = open;
        this.node = node;
        this.expected = expected;
    }

    getConflictingNodes() {
        return { primary: this.open, secondary: [ this.node ] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            eng: `Did you mean to close this with a ${this.expected.getText()}?`,
            "😀": WRITE
        }
    }

}