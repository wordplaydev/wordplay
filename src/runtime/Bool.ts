import Value from "./Value";

export default class Bool extends Value {

    readonly bool: boolean;

    constructor(bool: boolean) {
        super();

        this.bool = bool;
    }

    toString() { return this.bool ? "⊤" : "⊥"; }

}