import type Conflict from "../conflicts/Conflict";
import { UnknownConversion } from "../conflicts/UnknownConversion";
import Expression from "./Expression";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Token from "./Token";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Evaluation from "../runtime/Evaluation";
import type Context from "./Context";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import FunctionException from "../runtime/FunctionException";
import Exception from "../runtime/Exception";
import ConversionDefinition from "./ConversionDefinition";
import Halt from "../runtime/Halt";
import Action from "../runtime/Action";
import Block from "./Block";
import { CONVERT_SYMBOL, THIS_SYMBOL } from "../parser/Tokenizer";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import TokenType from "./TokenType";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import TypePlaceholder from "./TypePlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Names from "./Names";
import Name from "./Name";

export default class Convert extends Expression {
    
    readonly expression: Expression;
    readonly convert: Token;
    readonly type: Type;

    constructor(expression: Expression, type: Type, convert?: Token) {
        super();

        this.expression = expression;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.type = type;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "expression", types:[ Expression ] },
            { name: "convert", types:[ Token ] },
            { name: "type", types:[ Type ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Convert(
            this.replaceChild(pretty, "expression", this.expression, original, replacement), 
            this.replaceChild(pretty, "type", this.type, original, replacement),
            this.replaceChild(pretty, "convert", this.convert, original, replacement)
        ) as this; 
    }

    getConversionSequence(context: Context): ConversionDefinition[] | undefined {

        // What's the input type?
        const inputType = this.expression.getTypeUnlessCycle(context);

        // Find all the type's conversions
        const typeConversions = inputType.getAllConversions(context);

        // Find all the conversions in enclosing blocks.
        const scopeConversions = 
            (context.get(this)?.getAncestors()?.filter(a => a instanceof Block) as Block[])
                .reduce((list: ConversionDefinition[], block) => 
                    [...list, ...(block.statements.filter(s => s instanceof ConversionDefinition) as ConversionDefinition[])], [])
             ?? [];

        // Find a path between the input type and the desired type,
        return getConversionPath(inputType, this.type, [ ... typeConversions, ... scopeConversions ], context);

    }

    computeConflicts(context: Context): Conflict[] { 
        
        // If we know the expression's type, there must be a corresponding conversion on that type.
        const exprType = this.expression.getTypeUnlessCycle(context);
        const conversionPath = this.getConversionSequence(context);
        if(!(exprType instanceof UnknownType) && !this.type.accepts(exprType, context) && (conversionPath === undefined || conversionPath.length === 0))
            return [ new UnknownConversion(this, this.type) ];
        
        return [];
    
    }

    computeType(context: Context): Type {
        
        // Technically we have a type given, but such a conversion doesn't necessarily exist.
        // Find the conversion to see.
        // Get the conversion definition.
        const conversions = this.getConversionSequence(context);
        if(conversions === undefined || conversions.length === 0) return new UnknownType(this);
        const lastConversion = conversions[conversions.length - 1];
        return lastConversion.output; 

    }

    compile(context: Context): Step[] {

        // If the type of value is already the type of the requested conversion, then just leave the value on the stack and do nothing.
        // Otherwise, identify the series of conversions that will achieve the right output type.
        const conversions = 
            this.type.accepts(this.expression.getType(context), context) ? [] :
            this.getConversionSequence(context);

        // Evaluate the expression to convert, then push the conversion function on the stack.
        return [ 
            new Start(this),
            ...this.expression.compile(context),
            ...(
                conversions === undefined || (conversions.length === 0 && !this.type.accepts(this.expression.getType(context), context)) ?
                    [ new Halt(evaluator => new FunctionException(evaluator, this, evaluator.peekValue(), this.type.toWordplay()), this) ] :
                    conversions.map(conversion => new Action(
                        this, 
                        {
                            "😀": TRANSLATE,
                            eng: `Translate to ${conversion.output.toWordplay()}`
                        },
                        evaluator =>  {
                            // Get the value to convert
                            const value = evaluator.popValue(undefined);
                            if(value instanceof Exception) return value;
                            
                            // Execute the conversion.
                            evaluator.startEvaluation(
                                new Evaluation(
                                    evaluator,
                                    this,
                                    conversion, 
                                    conversion.expression, 
                                    value,
                                    new Map().set(new Names([ new Name(THIS_SYMBOL)]), value)
                                )
                            );

                            return undefined;
                        }
                    ))
            ),
            new Finish(this)
        ];
    }

    evaluate() {
        return undefined;
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression)
            this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.expression)
            return getExpressionReplacements(context.source, this, this.expression, context);
        else if(child === this.type) {
            // Any type it's convertable to.
            const inputType = this.expression.getTypeUnlessCycle(context);
            return inputType
                .getAllConversions(context)
                .filter(conversion => conversion.input instanceof Type && conversion.input.accepts(inputType, context))
                .map(conversion => new Replace(context.source, child, conversion.output));
        }

    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());
        else if(child === this.type) return new Replace(context.source, child, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Convert a value"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "We start by evaluating the value to convert, then do zero or more conversions to get to the desired type."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Yay, we have our converted value!"
        }
    }

}

function getConversionPath(input: Type, output: Type, conversions: ConversionDefinition[], context: Context): ConversionDefinition[] {

    // Breadth first search through the conversion graph for a path from input type to output type.
    const edges: Map<Type, Type> = new Map();
    const queue: Type[] = [];
    const visited: Set<Type> = new Set();

    queue.push(input);
    visited.add(input);
  
    while (queue.length > 0) {
        const currentInput = queue.shift() as Type;
        // Is the type a match for the desired output? Return the path!
        if(output.accepts(currentInput, context)) {

            const path: ConversionDefinition[] = [];
            // Start from the output
            let to = output;

            // Find the path, tracing backwards from output to input.
            while(true) {
                // Find the type that goes to this type
                const fromKey = Array.from(edges.keys()).find(t => t.accepts(to, context));
                const from = fromKey === undefined ? undefined : edges.get(fromKey);
                // There should always be one; bail if there's not.
                if(from === undefined) return [];
                // Find the conversion that maps from -> to
                const conversion = conversions.find(c => c.convertsTypeTo(from, to, context));
                // If we didn't find one, bail; something's wrong.
                if(conversion === undefined) return [];
                // Add to the path.
                path.unshift(conversion);
                // If from is compatible with the input, we're done!
                if(from.accepts(input, context)) return path;
                // Otherwise, set the "to" to "from" and find the next transition.
                to = from;
            }
        }

        // Find all of the output types reachable through conversions
        for (let out of conversions.filter(c => c.convertsType(currentInput, context)).map(c => c.output).filter(c => c instanceof Type) as Type[]) {
            // If we haven't already visited this one, visit it.
            if(Array.from(visited).find(type => out.accepts(type, context)) === undefined) {
                // We remember the edges in reverse so we can trace backwards from it.
                edges.set(out, currentInput);
                queue.push(out);
                visited.add(out);
            }
        }
    }
    return [];

}