import Node, { type Field } from "../../nodes/Node";
import type Caret from "../../models/Caret";
import type Project from "../../models/Project";
import type Transform from "../../transforms/Transform";
import Append from "../../transforms/Append";
import Replace from "../../transforms/Replace";
import type Context from "../../nodes/Context";
import Add from "../../transforms/Add";
import Bind from "../../nodes/Bind";
import Names from "../../nodes/Names";
import Expression from "../../nodes/Expression";
import Block from "../../nodes/Block";
import ExpressionPlaceholder from "../../nodes/ExpressionPlaceholder";
import BooleanLiteral from "../../nodes/BooleanLiteral";
import TextLiteral from "../../nodes/TextLiteral";
import Template from "../../nodes/Template";
import Conditional from "../../nodes/Conditional";
import ListLiteral from "../../nodes/ListLiteral";
import SetLiteral from "../../nodes/SetLiteral";
import MapLiteral from "../../nodes/MapLiteral";
import KeyValue from "../../nodes/KeyValue";
import FunctionDefinition from "../../nodes/FunctionDefinition";
import Name from "../../nodes/Name";
import StructureDefinition from "../../nodes/StructureDefinition";
import ConversionDefinition from "../../nodes/ConversionDefinition";
import TypePlaceholder from "../../nodes/TypePlaceholder";
import Reaction from "../../nodes/Reaction";
import Language from "../../nodes/Language";
import { getPossibleLanguages } from "../../transforms/getPossibleLanguages";
import Unit from "../../nodes/Unit";
import { getPossibleDimensions, getPossibleUnits } from "../../transforms/getPossibleUnits";
import Docs from "../../nodes/Docs";
import Doc from "../../nodes/Doc";
import Reference from "../../nodes/Reference";
import Refer from "../../transforms/Refer";
import Token from "../../nodes/Token";
import Dimension from "../../nodes/Dimension";
import NameToken from "../../nodes/NameToken";
import Type from "../../nodes/Type";
import BooleanType from "../../nodes/BooleanType";
import MeasurementType from "../../nodes/MeasurementType";
import TextType from "../../nodes/TextType";
import ListType from "../../nodes/ListType";
import SetType from "../../nodes/SetType";
import MapType from "../../nodes/MapType";
import NameType from "../../nodes/NameType";
import ListAccess from "../../nodes/ListAccess";
import SetOrMapAccess from "../../nodes/SetOrMapAccess";
import StreamType from "../../nodes/StreamType";
import Previous from "../../nodes/Previous";
import type Definition from "../../nodes/Definition";
import BinaryOperation from "../../nodes/BinaryOperation";
import TokenType from "../../nodes/TokenType";
import Convert from "../../nodes/Convert";
import UnaryOperation from "../../nodes/UnaryOperation";
import { NEGATE_SYMBOL, NOT_SYMBOL } from "../../parser/Tokenizer";

/** Given a project and a caret in it, generate a set of valid transformations at that caret. */
export function getEditsAt(project: Project, caret: Caret): Transform[] {

    const source = caret.source;
    const context = project.getContext(source);

    // Is the caret on a specific token or node?
    const node = caret.position instanceof Node ? caret.position : caret.getToken() ?? undefined;

    // Initialize a list of transforms
    let transforms: Transform[] = [];

    // If the caret is a position, find out what can go before or after
    if(typeof caret.position === "number") {

        let { before, after } = caret.getNodesBetween();
    
        let beforeToAnalyze = before;
        let afterToAnalyze = after;

        // If not on an empty line, filter out nodes in blocks, since it's confusing to get recommendations on the same line for blocks.
        if(typeof caret.position === "number" && !source.isEmptyLine(caret.position)) {
            beforeToAnalyze = before.filter(node => !(project.get(node)?.getParent() instanceof Block));
            afterToAnalyze = after.filter(node => !(project.get(node)?.getParent() instanceof Block));
        }

        // Get a list of transforms before and after this position.
        transforms = 
            [
                // // Get all of the replacements possible immediately before the position.
                ... beforeToAnalyze.reduce((transforms: Transform[], child) =>
                    [ ... transforms, ...getEditsBefore(project, context, child, caret.position as number) ], []),
                // Get all of the replacements possible and the ends of the nodes just before the position.
                ... afterToAnalyze.reduce((transforms: Transform[], child) =>
                    [ ...transforms, ...getEditsAfter(project, context, child, caret.position as number) ], [])
            ];

        // Then, for each after, see if it's parent allows the node to be an arbitrary expression, and if so,
        // generate edits that postfix the node.
        for(const node of after) {
            if(node instanceof Expression)
                transforms = [ ...transforms, ...getPostfixEdits(context, node) ]; 
        }

    }
    // If the node is a selection, offer replacements.
    else if(node !== undefined) {
        
        // What can this be replaced with?
        transforms = [
            ...getReplacements(project, context, node),
            ...(node instanceof Expression ? getPostfixEdits(context, node) : [])
        ]; 

    }

    // Filter out duplicates
    return transforms.filter((item1, index1, list) => !list.some((item2, index2) => index2 > index1 && item1.equals(item2)));

}

function getFieldOf(node: Node, context: Context): Field | undefined {

    const parent = context.get(node)?.getParent();
    if(parent === undefined) return;

    for(const [ field, value ] of Object.entries(parent.getChildrenAsGrammar()))
        if(value !== undefined && (value === node || (Array.isArray(value) && value.includes(node))))
            return parent.getGrammar().find(f => f.name === field);

    return undefined;

}

/** Walk the grammar, calling the specified visitor function at each node. */
function traverseGrammar(
    grammar: Field[], 
    fields: Record<string, Node | Node[] | undefined>, 
    visit: (field: Field, node: Node | undefined, types: (undefined | Function)[], list: { list: Node[], index: number | undefined, length: number } | undefined) => boolean) {
    for(const field of grammar) {
        const value = fields[field.name];
        if(Array.isArray(value)) {
            let types = field.types[0];
            if(!Array.isArray(types))
                throw Error(`Found list on non-list field ${parent.constructor.name}.${field.name}`);
            if(value.length === 0)
                visit(field, undefined, types, { list: value, index: undefined, length: 0 });
            else {
                for(const [ index, sibling ] of value.entries()) {
                    if(!Array.isArray(types))
                        throw Error(`Found list on non-list field ${parent.constructor.name}.${field.name}`);
                    else {
                        if(visit(field, sibling, types, { list: value, index, length: value.length }))
                            return;
                    }
                }
            }
        }
        else if(value instanceof Node) {
            const types = field.types;
            if(Array.isArray(types[0]))
                throw Error(`Found list of nodes on field declared as a single node ${parent.constructor.name}.${field.name}`);
            else if(visit(field, value, types as (undefined | Function)[], undefined))
                return;
        }
        // If this field is undefined, add the types that the field allows
        else if(value === undefined) {
            const types = field.types;
            if(Array.isArray(types[0]))
                throw Error(`Found list of nodes on field declared as a single node ${parent.constructor.name}.${field.name}`);
            visit(field, value, types as (undefined | Function)[], undefined);
        }
    }
}

/** Given a node, identify a set of possible replacements for the node */
function getReplacements(project: Project, context: Context, selection: Node): Transform[] {

    // Find the parent of the node.
    const parent = project.get(selection)?.getParent();
    if(parent === undefined) return [];

    // Traverse the parent's grammar to find out what types are allowed.
    const transforms: Transform[] = [];
    traverseGrammar(parent.getGrammar(), parent.getChildrenAsGrammar(), (field, node, kinds, list) => {
        if(node === selection) {
            for(const kind of kinds)
                if(kind === undefined)
                    transforms.push(new Replace(context, selection, undefined));
                else {
                    // Pass the list index if the replacement is in a list.
                    for(const possibility of getPossibleNodes(context, node, kind, field, list?.index))
                        transforms.push(new Replace(context, selection, possibility));
                }
            // Stop iterating.
            return true;
        }
        return false;
    });

    return transforms;

}

function getEditsBefore(project: Project, context: Context, anchor: Node, position: number): Transform[] {

    // Find the parent of the node.
    const parent = project.get(anchor)?.getParent();
    if(parent === undefined) return [];

    // Walk the grammar, accumulating possible transforms, until we reach the node.
    let transforms: Transform[] = [];
    traverseGrammar(parent.getGrammar(), parent.getChildrenAsGrammar(), (field, node, kinds, list) => {
        // If in a list...
        if(list !== undefined) {
            // Found the node, time to stop.
            if(node === anchor)
                return true;
            // If this is after the first item in the list, reset the possible transforms, since 
            // the list is now defining what's eligible before.
            if(list.index !== undefined && list.index > 0)
                transforms.length = 0;
            // If we haven't found the node, and it's possibly next, we could insert one of the types.
            for(const type of kinds)
                if(type !== undefined) {
                    const index = list.index === undefined ? 0 : list.index + 1;
                    // Pass the index after the current index, in case the anchor node is next.
                    for(const possible of getPossibleNodes(context, node, type, field, index))
                        transforms.push(new Append(context, position, parent, list.list, index, possible));
                }
        }
        // If a standalone node, either mark found or add possible types and stop.
        else if(node !== undefined) {
            if(node === anchor)
                return true;
            // If it's not the node...
            else {
                // If the node can't be undefined, then reset the transforms. Otherwise, carry forward the prior 
                // node's possible transforms.
                if(!kinds.includes(undefined))
                    transforms.length = 0;
                // Add the possible types this node could be.
                for(const kind of kinds)
                    if(kind !== undefined)
                        for(const possible of getPossibleNodes(context, node, kind, field))
                            transforms.push(new Add(context, position, parent, field.name, possible));
                return false;
            }
        }
        // If undefined, add the possible node
        else if(node === undefined) {
            for(const kind of kinds)
                if(kind !== undefined)
                    for(const possible of getPossibleNodes(context, node, kind, field))
                        transforms.push(new Add(context, position, parent, field.name, possible));
        }
        return false;
    });

    // Generate transforms based on what's next in the grammar.
    return transforms;

}

function getEditsAfter(project: Project, context: Context, anchor: Node, position: number): Transform[] {

    // Find the parent of the node.
    const parent = project.get(anchor)?.getParent();
    if(parent === undefined) return [];

    // Walk the grammar, consuming matching children finding the node, finding everything that can follow the node.
    let found = false;
    let transforms: Transform[] = [];
    traverseGrammar(parent.getGrammar(), parent.getChildrenAsGrammar(), (field, node, kinds, list) => {
        // If in a list...
        if(list !== undefined) {
            if(node === anchor) {
                found = true;
            }
            // If we've already found the anchor, create transforms for all possible valid insertions.
            if(found) {
                for(const kind of kinds)
                    if(kind !== undefined) {
                        const index = list.index === undefined ? 0 : list.index + 1;
                        // Pass the index after the current index, since we're trying to see what can be added after.
                        for(const possible of getPossibleNodes(context, node, kind, field, index))
                            transforms.push(new Append(context, position, parent, list.list, index, possible));
                    }
            }
            // If the node is before the last item in the list, then nothing else can be inserted, so we stop.
            return list.index === undefined || list.index < list.length - 1;
        }
        // If a standalone node, either mark found or add possible types and stop.
        else if(node !== undefined) {
            if(node === anchor) {
                found = true;

                // If the anchor we're after is a reference, add replacement references, to enable names to be completed.
                if(node instanceof Reference) {
                    for(const kind of kinds) {
                        if(kind !== undefined)
                            for(const possible of getPossibleNodes(context, node, kind, field))
                                transforms.push(new Replace(context, node, possible));
                    }
                }
            }
            // If we've found it...
            else if(found) {
                // ... And the next node is unparsable, offer to replace.
                for(const kind of kinds)
                    if(kind === undefined)
                        transforms.push(new Replace(context, node, undefined));
                    else {
                        for(const possible of getPossibleNodes(context, node, kind, field))
                            transforms.push(new Replace(context, node, possible));
                    }
                return true;
            }
        }
        // If undefined, add replacements and continue
        else if(node === undefined) {
            if(found) {
                for(const type of kinds)
                    if(type !== undefined)
                        for(const possible of getPossibleNodes(context, node, type, field))
                            transforms.push(new Add(context, position, parent, field.name, possible));
            }
        }
        return false;
    });

    // Generate transforms based on what's next in the grammar.
    return transforms;

}

function getPossibleNodes(context: Context, node: Node | undefined, kind: Function, field: Field, index?: number): (Node | Refer<Node>)[] {

    const expectedType = field.getType ? field.getType(context, index) : undefined;
    // Get possible definitions, using the field override, or defaulting to all definitions in scope at the location.
    const definitions = field.getDefinitions ? field.getDefinitions(context) : node !== undefined ? node.getAllDefinitions(node, context) : [];

    switch(kind) {
        case Bind:
            return [ Bind.make(undefined, Names.make(["_"])) ];
        case Expression:
            const possibilities = [
                ...definitions.map(def => new Refer((name: string) => Reference.make(name), def)),
                Block.make([ new ExpressionPlaceholder() ]),
                new BooleanLiteral(true),
                new BooleanLiteral(false),
                TextLiteral.make(""),
                Template.make(),
                Conditional.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
                ListLiteral.make([]),
                SetLiteral.make([]),
                MapLiteral.make([ new KeyValue(new ExpressionPlaceholder(), new ExpressionPlaceholder())]),
                FunctionDefinition.make(undefined, new Names([ Name.make() ]), undefined, [], new ExpressionPlaceholder()),
                StructureDefinition.make(undefined, new Names([ Name.make() ]), [], undefined, []),
                ConversionDefinition.make(undefined, new TypePlaceholder(), new TypePlaceholder(), new ExpressionPlaceholder()),
                Reaction.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make())
            ];
            // Filter by type if we have one.            
            return expectedType ? possibilities.filter(nodeOrRef => {
                const type = nodeOrRef.getType(context);
                return type !== undefined && expectedType.accepts(type, context);
             }) : possibilities;
        case Type: 
            return [
                new BooleanType(),
                ...[ MeasurementType.make(), ... (getPossibleUnits(context.project).map(u => MeasurementType.make(u))) ],
                ...[ TextType.make(), ... (getPossibleLanguages(context.project).map(l => TextType.make(Language.make(l)))) ],
                ListType.make(new TypePlaceholder()),
                SetType.make(new TypePlaceholder()),
                MapType.make(new TypePlaceholder(), new TypePlaceholder()),
                // Any structure definition types that match the aren't the currently selected one.
                ... definitions
                    .filter((def): def is StructureDefinition => def instanceof StructureDefinition)
                    .map(s => new NameType(s.names.getTranslation("eng")))
            ];
        case Language:
            return getPossibleLanguages(context.project).map(lang => Language.make(lang));
        case Unit:
            return getPossibleUnits(context.project);
        case Dimension:
            return getPossibleDimensions(context.project).map(dim => new NameToken(dim));
        case Docs:
            return [ new Docs([ new Doc("")]) ];
        case Reference:
            // We can get possible references depend on the binding scope for the insertion point
            return definitions.map(def => new Refer(name => Reference.make(name), def));
        case Token:
            // If we know what type of token to make, make it.
            if(field.getToken)
                if(definitions.length > 0)
                    return definitions.map(def => new Refer(name => (field.getToken as Function)(name), def));
                else
                    return [ field.getToken(undefined) ];
        
    }

    return [];

}

function getPostfixEdits(context: Context, expr: Expression): Transform[] {

    const field = getFieldOf(expr, context);
    if(field && (field.types.includes(Expression) || (Array.isArray(field.types[0]) && field.types[0].includes(Expression)))) {

        const type = expr.getType(context);

        return [
            // If the type is a boolean, offer a conditional
            ...(type instanceof BooleanType ? [ 
                    new Replace(context, expr, Conditional.make(expr, new ExpressionPlaceholder(), new ExpressionPlaceholder())),
                    new Replace(context, expr, new UnaryOperation(new Token(NOT_SYMBOL, TokenType.UNARY_OP), expr))
            ] : []),
            ...(type instanceof MeasurementType ? [
                new Replace(context, expr, new UnaryOperation(new Token(NEGATE_SYMBOL, TokenType.UNARY_OP), expr))
            ] : []),
            // If the type is a list, offer a list access
            ...(type instanceof ListType ? [ new Replace(context, expr, ListAccess.make(expr, new ExpressionPlaceholder())) ] : []),
            // If the type is a set or map, offer a list access
            ...(type instanceof SetType || type instanceof MapType ? [ new Replace(context, expr, SetOrMapAccess.make(expr, new ExpressionPlaceholder())) ] : []),
            // If the type is a stream, offer a previous
            ...(type instanceof StreamType ? [ new Replace(context, expr, Previous.make(expr, new ExpressionPlaceholder())) ] : []),
            // Reactions
            ...[ new Replace(context, expr, Reaction.make(expr, new ExpressionPlaceholder()))],
            // If given a type, any binary operations that are available on the type. Wrap in a block if a BinaryOperation or Conditional
            ...((type === undefined ? [] : type.getAllDefinitions(expr, context).filter((def: Definition): def is FunctionDefinition => def instanceof FunctionDefinition && def.isOperator()) 
                .map((def: FunctionDefinition) => 
                    new Replace(context, expr, new Refer(() => new BinaryOperation(Block.make([ expr ]), new Token(def.getOperatorName() ?? "", TokenType.BINARY_OP), new ExpressionPlaceholder()), def ))))),
            // Get any conversions available
            ...(type === undefined ? [] :
                    type.getAllConversions(context)
                        .filter(conversion => conversion.input instanceof Type && type.accepts(conversion.input, context))
                        .map(conversion => new Replace(context, expr, new Convert(expr, conversion.output.replace()))))
        ];

    }
    return [];
        
}