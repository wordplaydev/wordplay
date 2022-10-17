import AnyType from "./AnyType";
import Block from "./Block";
import BooleanLiteral from "./BooleanLiteral";
import BooleanType from "./BooleanType";
import Conditional from "./Conditional";
import type Context from "./Context";
import ConversionDefinition from "./ConversionDefinition";
import Expression from "./Expression";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import FunctionDefinition from "./FunctionDefinition";
import { getPossibleLanguages } from "./getPossibleLanguages";
import { getPossibleUnits } from "./getPossibleUnits";
import KeyValue from "./KeyValue";
import Language from "./Language";
import ListLiteral from "./ListLiteral";
import MapLiteral from "./MapLiteral";
import MeasurementLiteral from "./MeasurementLiteral";
import Name from "./Name";
import Previous from "./Previous";
import Reaction from "./Reaction";
import Reference from "./Reference";
import SetLiteral from "./SetLiteral";
import StructureDefinition from "./StructureDefinition";
import Template from "./Template";
import TextLiteral from "./TextLiteral";
import type Type from "./Type";
import TypePlaceholder from "./TypePlaceholder";
import TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";
import type Node from "./Node";
import type Transform from "./Transform"
import Alias from "./Alias";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";

/** Offer possible expressions compatible with the given type, or if none was given, any possible expression */
export default function getPossibleExpressions(parent: Node, child: Expression | Unparsable | undefined, context: Context, type: Type=new AnyType()): Transform[] {

    const project = context.source.getProject();

    return [
        ...parent.getAllDefinitions(parent, context).map(def => new Reference<Name>(def, name => new Name(name))),
        ...(child === undefined ? [] : [ new Block([], [ child.clone() ], false, false) ]),
        new BooleanLiteral(true),
        new BooleanLiteral(false),
        ...[ new MeasurementLiteral(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => new MeasurementLiteral(undefined, u))) ],
        ...[ new TextLiteral(), ... (project === undefined ? [] : getPossibleLanguages(project).map(l => new TextLiteral(undefined, new Language(l)))) ],
        new Template(),
        ...(child instanceof Expression && child.getType(context) instanceof BooleanType ? [ new Conditional( child, new ExpressionPlaceholder(), new ExpressionPlaceholder()) ] : [] ),
        new Conditional(new ExpressionPlaceholder(), new ExpressionPlaceholder(), new ExpressionPlaceholder()),
        new Block([], [ new ExpressionPlaceholder() ], false, false),
        new ListLiteral([ new ExpressionPlaceholder() ]),
        new SetLiteral([ new ExpressionPlaceholder() ]),
        new MapLiteral([ new KeyValue(new ExpressionPlaceholder(), new ExpressionPlaceholder())]),
        new FunctionDefinition([], [], [], [], new ExpressionPlaceholder()),
        new StructureDefinition([], [ new Alias(PLACEHOLDER_SYMBOL) ], [], [], []),
        new ConversionDefinition([], new TypePlaceholder(), new TypePlaceholder(), new ExpressionPlaceholder()),
        new Reaction(new ExpressionPlaceholder(), new ExpressionPlaceholder(), new ExpressionPlaceholder()),
        new Previous(new ExpressionPlaceholder(), new ExpressionPlaceholder())
    ].filter(expr => 
            (expr instanceof Expression && type.accepts(expr.getType(context), context)) ||
            (expr instanceof Reference && (expr.definition instanceof TypeVariable || type.accepts(expr.definition.getType(context), context))))

}