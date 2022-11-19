import type BinaryOperation from "./BinaryOperation";
import type Bind from "./Bind";
import type Block from "./Block";
import type Column from "./Column";
import type ColumnType from "./ColumnType";
import type Convert from "./Convert";
import type Evaluate from "./Evaluate";
import type Expression from "./Expression";
import type ExpressionPlaceholder from "./ExpressionPlaceholder";
import type FunctionDefinition from "./FunctionDefinition";
import type ListAccess from "./ListAccess";
import type Name from "./Name";
import type NameType from "./NameType";
import type Node from "./Node";
import type Previous from "./Previous";
import type PropertyReference from "./PropertyReference";
import type Reference from "./Reference";
import type Select from "./Select";
import type SetOrMapAccess from "./SetOrMapAccess";
import type StructureDefinition from "./StructureDefinition";
import type This from "./This";
import type Token from "./Token";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";
import type TypePlaceholder from "./TypePlaceholder";
import type UnaryOperation from "./UnaryOperation";
import type UnparsableExpression from "./UnparsableExpression";

export type UnknownTypeReason = 
    UnparsableExpression | // Couldn't parse something
    Bind |              // Couldn't infer type of name
    Block |             // Block didn't have an expression
    Convert |           // Conversion didn't exist
    ListAccess |        // List type couldn't be determined
    SetOrMapAccess |    // Set or map type couldn't be determined
    Column | ColumnType | // No bind in column
    Previous |          // Stream type couldn't be determined
    PropertyReference | // Reference couldn't be resolved
    Reference |         // Reference couldn't be resolved
    Select |            // Couldn't resolve table
    This |              // Couldn't resolve this
    { typeVar: Evaluate | BinaryOperation | UnaryOperation | FunctionDefinition | StructureDefinition } | // Couldn't determine type variable definition
    { placeholder: ExpressionPlaceholder | TypePlaceholder | Token } |  // Placeholders don't have types
    { cycle: Node } |   // Type depended on itself
    { definition: UnaryOperation | BinaryOperation | Evaluate | Name | NameType, name: Expression | Token}; // Couldn't find a definition

export default class UnknownType extends Type {

    readonly reason: UnknownTypeReason;

    constructor(node: UnknownTypeReason) {
        super();

        this.reason = node;

    }
    
    getGrammar() { return []; }

    computeConflicts() {}
    accepts() { return false; }
    getNativeTypeName(): string { return "unknown"; }

    toWordplay() { return "�"; }

    replace() { return new UnknownType(this.reason) as this; }
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            eng: "An unknown type",
            "😀": `${TRANSLATE} •🤔`
        }
    }

}