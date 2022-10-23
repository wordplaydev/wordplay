import AnyType from "../nodes/AnyType";
import Block from "../nodes/Block";
import BooleanLiteral from "../nodes/BooleanLiteral";
import BooleanType from "../nodes/BooleanType";
import Conditional from "../nodes/Conditional";
import type Context from "../nodes/Context";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Expression from "../nodes/Expression";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import FunctionDefinition from "../nodes/FunctionDefinition";
import KeyValue from "../nodes/KeyValue";
import Language from "../nodes/Language";
import ListLiteral from "../nodes/ListLiteral";
import MapLiteral from "../nodes/MapLiteral";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import Previous from "../nodes/Previous";
import Reaction from "../nodes/Reaction";
import SetLiteral from "../nodes/SetLiteral";
import StructureDefinition from "../nodes/StructureDefinition";
import Template from "../nodes/Template";
import TextLiteral from "../nodes/TextLiteral";
import Type from "../nodes/Type";
import TypePlaceholder from "../nodes/TypePlaceholder";
import type Unparsable from "../nodes/Unparsable";
import type Node from "../nodes/Node";
import Alias from "../nodes/Alias";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import type Definition from "../nodes/Definition";
import TypeVariable from "../nodes/TypeVariable";
import type Source from "../models/Source";
import Name from "../nodes/Name";
import Replace from "./Replace";
import Append from "./Append";
import { getPossibleLanguages } from "./getPossibleLanguages";
import { getPossibleUnits } from "./getPossibleUnits";
import type Reference from "./Reference";
import BinaryOperation from "../nodes/BinaryOperation";
import ListType from "../nodes/ListType";
import ListAccess from "../nodes/ListAccess";
import MapType from "../nodes/MapType";
import SetType from "../nodes/SetType";
import SetOrMapAccess from "../nodes/SetOrMapAccess";
import StreamType from "../nodes/StreamType";
import Convert from "../nodes/Convert";

/** Offer possible expressions compatible with the given type, or if none was given, any possible expression */
export default function getPossibleExpressions(parent: Node, child: Expression | Unparsable | undefined, context: Context, type: Type=new AnyType()): (Expression | Definition)[] {

    const project = context.source.getProject();

    return [
        ...parent.getAllDefinitions(parent, context),
        ...(child === undefined ? [] : [ new Block([], [ child.clone(false).withPrecedingSpace("", true) ], false, false) ]),
        new BooleanLiteral(true),
        new BooleanLiteral(false),
        ...[ new MeasurementLiteral(), ... (project === undefined ? [] : getPossibleUnits(project).map(u => new MeasurementLiteral(undefined, u))) ],
        ...[ new TextLiteral(), ... (project === undefined ? [] : getPossibleLanguages(project).map(l => new TextLiteral(undefined, new Language(l)))) ],
        new Template(),
        ...(child instanceof Expression && child.getType(context) instanceof BooleanType ? [ new Conditional( child, new ExpressionPlaceholder(), new ExpressionPlaceholder()) ] : [] ),
        new Conditional(new ExpressionPlaceholder(), new ExpressionPlaceholder(), new ExpressionPlaceholder()),
        new Block([], [ new ExpressionPlaceholder() ], false, false),
        new ListLiteral([]),
        new SetLiteral([]),
        new MapLiteral([ new KeyValue(new ExpressionPlaceholder(), new ExpressionPlaceholder())]),
        new FunctionDefinition([], [], [], [], new ExpressionPlaceholder()),
        new StructureDefinition([], [ new Alias(PLACEHOLDER_SYMBOL) ], [], [], []),
        new ConversionDefinition([], new TypePlaceholder(), new TypePlaceholder(), new ExpressionPlaceholder()),
        new Reaction(new ExpressionPlaceholder(), new ExpressionPlaceholder(), new ExpressionPlaceholder()),
        new Previous(new ExpressionPlaceholder(), new ExpressionPlaceholder())
    ].filter(expr => expr instanceof TypeVariable ? type instanceof AnyType : type.accepts(expr.getType(context), context))
}

export function getExpressionReplacements(source: Source, parent: Node, child: Expression | Unparsable, context: Context, type: Type=new AnyType()): Replace<Expression>[] {

    return getPossibleExpressions(parent, child, context, type)
        .map(expr => new Replace(
                source, 
                child, 
                getPossibleReference(expr)
            )
        );

}

export function getExpressionInsertions(source: Source, position: number, parent: Node, list: Node[], before: Node | undefined, context: Context, type: Type=new AnyType()): Append<Expression>[] {

    return getPossibleExpressions(parent, undefined, context, type)
        .map(expr => new Append(
                source,
                position,
                parent,
                list,
                before,
                getPossibleReference(expr)
            )
        );

}

function getPossibleReference(replacement: Expression | Definition): Expression | Reference<Expression> {
    return replacement instanceof Expression && !(replacement instanceof FunctionDefinition) && !(replacement instanceof StructureDefinition) ? 
        replacement : [ (name: string) => new Name(name), replacement ]

}

export function getPossiblePostfix(context: Context, node: Expression, type?: Type): Replace<Expression>[] {

    return [
        // If the type is a boolean, offer a conditional
        ...(type instanceof BooleanType ? [ new Replace(context.source, node, new Conditional(node.withPrecedingSpace("", true), new ExpressionPlaceholder(), new ExpressionPlaceholder())) ] : []),
        // If the type is a list, offer a list access
        ...(type instanceof ListType ? [ new Replace(context.source, node, new ListAccess(node.withPrecedingSpace("", true), new ExpressionPlaceholder())) ] : []),
        // If the type is a set or map, offer a list access
        ...(type instanceof SetType || type instanceof MapType ? [ new Replace(context.source, node, new SetOrMapAccess(node.withPrecedingSpace("", true), new ExpressionPlaceholder())) ] : []),
        // If the type is a stream, offer a previous
        ...(type instanceof StreamType ? [ new Replace(context.source, node, new Previous(node.withPrecedingSpace("", true), new ExpressionPlaceholder())) ] : []),
        // Reactions
        ...[ new Replace(context.source, node, new Reaction(node.withPrecedingSpace("", true), new ExpressionPlaceholder(), new ExpressionPlaceholder()))],
        // If given a type, any binary operations that are available on the type.
        ...((type === undefined ? [] : type.getAllDefinitions(node, context).filter((def): def is FunctionDefinition => def instanceof FunctionDefinition && def.isOperator()) 
            .map(def => new Replace(context.source, node, [ () => new BinaryOperation(def.getOperatorName() as string, node.withPrecedingSpace("", true), new ExpressionPlaceholder()), def ])))),
        // Get any conversions available
        ...(type === undefined ? [] :
                type.getAllConversions(context)
                    .filter(conversion => conversion.input instanceof Type && type.accepts(conversion.input, context))
                    .map(conversion => new Replace(context.source, node, new Convert(node.withPrecedingSpace("", true), conversion.output.clone(true)))))

    ];

}