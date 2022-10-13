import AnyType from "./AnyType";
import Block from "./Block";
import BooleanLiteral from "./BooleanLiteral";
import Conditional from "./Conditional";
import type Context from "./Context";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import { getPossibleLanguages } from "./getPossibleLanguages";
import { getPossibleUnits } from "./getPossibleUnits";
import KeyValue from "./KeyValue";
import Language from "./Language";
import MapLiteral from "./MapLiteral";
import MeasurementLiteral from "./MeasurementLiteral";
import Template from "./Template";
import TextLiteral from "./TextLiteral";
import type Type from "./Type";

/** Offer possible expressions compatible with the given type, or if none was given, any possible expression */
export default function getPossibleExpressions(context: Context, type: Type=new AnyType()) {

    const project = context.source.getProject();

    return [
        new BooleanLiteral(true),
        new BooleanLiteral(false),
        ...[ new MeasurementLiteral(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => new MeasurementLiteral(undefined, u))) ],
        ...[ new TextLiteral(), ... (project === undefined ? [] : getPossibleLanguages(project).map(l => new TextLiteral(undefined, new Language(l)))) ],
        new Template(),
        new Conditional(new ExpressionPlaceholder(), new ExpressionPlaceholder(), new ExpressionPlaceholder()),
        new Block([], [ new ExpressionPlaceholder() ], false, false),
        new MapLiteral([ new KeyValue(new ExpressionPlaceholder(), new ExpressionPlaceholder())]),
    ].filter(expr => type.accepts(expr.getType(context), context));

}