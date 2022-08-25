import type ExpressionPlaceholder from "../nodes/PlaceholderExpression";
import type PlaceholderType from "../nodes/PlaceholderType";
import Conflict from "./Conflict";


export class Placeholder extends Conflict {
    readonly placeholder: ExpressionPlaceholder | PlaceholderType;
    constructor(placeholder: ExpressionPlaceholder | PlaceholderType) {
        super(true);
        this.placeholder = placeholder;
    }
}
