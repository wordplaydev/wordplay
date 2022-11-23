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
import NoneType from "./NoneType";

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
    
    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        const name = this.name?.getText();
        if(name === undefined) return conflicts;

        // Borrows can't depend on on sources that depend on this program.
        // Check the dependency graph to see if this definition's source depends on this borrow's source.
        const project = context.source.getProject();
        const [ definition, source ] = project?.getDefinition(context.source, name) ?? context.shares?.getDefinitions() ?? [];
        if(definition === undefined && source === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts;
    
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        const name = this.getName();
        return name === undefined ? undefined : evaluator.borrow(name);
    }    

    computeType(): Type {
        return new NoneType();
    }
    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }

    getName() { return this.name === undefined ? undefined : this.name.getText(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this, this.version, new Unit())).toNumber(); }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.name)
            // Return name tokens of all shares
            return context.shares
                ?.getDefinitions()
                .map(def => new Replace<Token>(context.source, child, [ name => new NameToken(name), def ])) ?? [];
    
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

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Find the shared name in other programs to borrow."
        }
    }

}