import type Conflict from "../conflicts/Conflict";
import { UnknownBorrow } from "../conflicts/UnknownBorrow";
import type Node from "./Node";
import type Context from "./Context";
import Token from "./Token";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Measurement from "../runtime/Measurement";
import Unit from "./Unit";
import TokenType from "./TokenType";
import { BORROW_SYMBOL } from "../parser/Tokenizer";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Expression from "./Expression";
import type Bind from "./Bind";
import type Type from "./Type";
import type { TypeSet } from "./UnionType";
import type Definition from "./Definition";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import Stream from "../runtime/Stream";
import Start from "../runtime/Start";
import type Value from "../runtime/Value";
import UnknownType from "./UnknownType";
import TypeVariable from "./TypeVariable";
import type Source from "../models/Source";

export default class Borrow extends Expression {

    readonly borrow: Token;
    readonly name?: Token;
    readonly version?: Token;

    constructor(borrow?: Token, name?: Token, version?: Token) {
        super();

        this.borrow = borrow ?? new Token(BORROW_SYMBOL, TokenType.BORROW);
        this.name = name;
        this.version = version;

        this.computeChildren();
    }

    getGrammar() { 
        return [
            { name: "borrow", types:[ Token ] },
            { name: "name", types:[ Token, undefined ] },
            { name: "version", types:[ Token, undefined ] },
        ]; 
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Borrow(
            this.replaceChild(pretty, "borrow", this.borrow, original, replacement), 
            this.replaceChild(pretty, "name", this.name, original, replacement),
            this.replaceChild(pretty, "version", this.version, original, replacement)
        ) as this; 
    }
    
    getDefinition(context: Context): [ Definition | undefined, Source | undefined ] {

        const name = this.name?.getText();
        if(name === undefined) return [ undefined, undefined ];

        const project = context.project;
        // See if any of the project's source files share this.
        if(project) {
            const [ definition, source ] = project.getDefinition(context.source, name) ?? [];
            if(definition !== undefined && source !== undefined) return [ definition, source ];
        }
        // If not, do any of the native bindings have the name?
        const streamOrNative = context.shares.resolve(name);
        return streamOrNative instanceof StructureDefinitionValue ? [ streamOrNative.definition, undefined ] :
            streamOrNative instanceof Stream ? [ streamOrNative, undefined ] :
            [ undefined, undefined ];

    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        // Borrows can't depend on on sources that depend on this program.
        // Check the dependency graph to see if this definition's source depends on this borrow's source.
        const [ definition, source ] = this.getDefinition(context) ?? [];
        if(definition === undefined && source === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts;
    
    }

    getDependencies(context: Context): Expression[] {

        const [ def ] = this.getDefinition(context);
        return def instanceof Expression ? [ def ] : [];

    }

    compile(): Step[] {
        return [ new Start(this), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        
        const name = this.getName();
        return name === undefined ? undefined : evaluator.borrow(name);
        
    }

    computeType(context: Context): Type {

        const [ definition ] = this.getDefinition(context);

        return definition === undefined || definition instanceof TypeVariable ? new UnknownType(this) : definition.getType(context);

    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }

    getName() { return this.name === undefined ? undefined : this.name.getText(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this, this.version, new Unit())).toNumber(); }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.name)
            // Return name tokens of all shares
            return context.shares
                ?.getDefinitions()
                .map(def => new Replace<Token>(context, child, [ name => new NameToken(name), def ])) ?? [];
    
    }

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

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Find the shared name in other programs to borrow."
        }
    }

}