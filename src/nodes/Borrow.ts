import type Conflict from "../conflicts/Conflict";
import { UnknownBorrow } from "../conflicts/UnknownBorrow";
import type Node from "./Node";
import type Context from "./Context";
import Token from "./Token";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Measurement from "../runtime/Measurement";
import Unit from "./Unit";
import TokenType from "./TokenType";
import { BORROW_SYMBOL } from "../parser/Tokenizer";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Expression from "./Expression";
import Bind from "./Bind";
import type Type from "./Type";
import type TypeSet from "./TypeSet";
import type Stream from "../runtime/Stream";
import type Value from "../runtime/Value";
import Source from "../models/Source";
import Evaluation from "../runtime/Evaluation";
import NameException from "../runtime/NameException";
import FunctionDefinition from "./FunctionDefinition";
import StructureDefinition from "./StructureDefinition";
import CycleException from "../runtime/CycleException";
import FunctionValue from "../runtime/FunctionValue";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import UnknownNameType from "./UnknownNameType";

export type SharedDefinition = Source | Bind | FunctionDefinition | StructureDefinition | Stream;

export default class Borrow extends Expression {

    readonly borrow: Token;
    readonly source?: Token;
    readonly dot?: Token;
    readonly name?: Token;
    readonly version?: Token;

    constructor(borrow?: Token, source?: Token, dot?: Token, name?: Token, version?: Token) {
        super();

        this.borrow = borrow ?? new Token(BORROW_SYMBOL, TokenType.BORROW);
        this.source = source;
        this.dot = dot;
        this.name = name;
        this.version = version;

        this.computeChildren();
    }

    getGrammar() { 
        return [
            { name: "borrow", types:[ Token ] },
            { name: "source", types:[ Token, undefined ] },
            { name: "dot", types:[ Token, undefined ] },
            { name: "name", types:[ Token, undefined ] },
            { name: "version", types:[ Token, undefined ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Borrow(
            this.replaceChild("borrow", this.borrow, original, replacement), 
            this.replaceChild("source", this.source, original, replacement),
            this.replaceChild("dot", this.dot, original, replacement),
            this.replaceChild("name", this.name, original, replacement),
            this.replaceChild("version", this.version, original, replacement)
        ) as this; 
    }
    
    isEvaluationInvolved() { return true; }

    getShare(context: Context): [ Source | undefined, SharedDefinition ] | undefined {

        if(this.source === undefined)
            return undefined;
        
        return context.project.getShare(this.source.getText(), this.name?.getText());

    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        // Borrows can't depend on on sources that depend on this program.
        // Check the dependency graph to see if this definition's source depends on this borrow's source.
        const [ definition, source ] = this.getShare(context) ?? [];
        if(definition === undefined && source === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts;
    
    }

    getDependencies(context: Context): Expression[] {

        const [ _, def ] = this.getShare(context) ?? [];
        return def instanceof Expression ? [ def ] : [];

    }

    compile(): Step[] {
        // One step, evaluted below in evaluate(), which launches the evaluation of the source
        // file containing the name referred to.
        return [ 
            new Start(this, evaluator => this.start(evaluator)),
            new Finish(this)
        ];
    }

    start(evaluator: Evaluator): Value | undefined {

        // Evaluate the source 
        const [ source, definition ] = this.getShare(evaluator.getCurrentContext()) ?? [];

        // If we didn't find anything, throw an exception.
        if(source === undefined) {

            // If there's no source and there's no definition, return an exception.
            if(definition === undefined)
                return new NameException(this.source?.getText() ?? this.name?.getText() ?? "", evaluator);
            
            // Otherwise, bind the definition in the current evaluation, wrapping it in a value if necessary.
            const value = definition instanceof FunctionDefinition ? new FunctionValue(definition, undefined) :
                definition instanceof StructureDefinition ? new StructureDefinitionValue(this, definition) :
                definition;
            
            if(value instanceof Bind || value instanceof Source)
                throw Error("It should't ever be possible that a Bind or Source is shared without a source.");

            // Bind the value in the current evaluation for use.
            evaluator.bind(definition.names, value);

            // Jump over the finish.
            evaluator.jump(1);
            
        }
        // If there is a source, we need to evaluate it to get the requested value.
        else {
            // If the source we're evaluating is already on the evaluation stack, it's a cycle.
            // Halt now rather than later having a stack overflow.
            if(evaluator.isEvaluatingSource(source))
                throw new CycleException(evaluator, this);

            // Otherwise, evaluate the source, and delegate the binding to the Evaluator.
            evaluator.startEvaluation(new Evaluation(evaluator, this, source));

        }
        
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        const [ source, definition ] = this.getShare(evaluator.getCurrentContext()) ?? [];

        // Now that the source is evaluated, bind it's value if we're binding the source,
        if(this.source) {
            const value = evaluator.popValue(undefined);
            if(this.name === undefined) {
                if(source === undefined) return new NameException(this.source.getText() ?? "", evaluator);
                evaluator.bind(source.names, value);
            }
            // Bind the share if we're binding a share.
            else if(this.name) {
                const name = this.name.getText();
                const value = evaluator.getLastEvaluation()?.resolve(name);
                if(definition === undefined || value === undefined) return new NameException(name ?? "", evaluator);
                evaluator.bind(definition.names, value);
            }
        }
        
    }

    computeType(context: Context): Type {

        const [ _, definition ] = this.getShare(context) ?? [];
        return definition === undefined ? new UnknownNameType(this, this.name, undefined) : definition.getType(context);

    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }

    getName() { return this.source === undefined ? undefined : this.source.getText(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this, this.version, Unit.Empty)).toNumber(); }

    getChildReplacement(): Transform[] | undefined { return undefined; }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `Borrow a value`
        }
    }

    getStart() { return this.borrow; }
    getFinish() { return this.source ?? this.borrow; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Find the shared name in other programs to borrow."
        }
    }

}

