import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import type TypePlaceholder from "../nodes/TypePlaceholder";
import Conflict from "./Conflict";


export class Placeholder extends Conflict {
    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;
    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(true);
        this.placeholder = placeholder;
    }
}
