import AnyType from "./AnyType";
import Block from "./Block";
import BooleanLiteral from "./BooleanLiteral";
import type Context from "./Context";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import KeyValue from "./KeyValue";
import MapLiteral from "./MapLiteral";
import Template from "./Template";
import Token from "./Token";
import type Type from "./Type";

/** Offer possible expressions compatible with the given type, or if none was given, any possible expression */
export default function getPossibleExpressions(context: Context, type: Type=new AnyType()) {

    return [
        new BooleanLiteral(true),
        new BooleanLiteral(false),
        new Template(),
        new Block([], [ new ExpressionPlaceholder() ], false, false),
        new MapLiteral([ new KeyValue(new ExpressionPlaceholder(), new ExpressionPlaceholder())]),
    ].filter(expr => type.accepts(expr.getType(context), context));

}