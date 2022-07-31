import type AccessName from "../nodes/AccessName";
import type BinaryOperation from "../nodes/BinaryOperation";
import type Bind from "../nodes/Bind";
import type Block from "../nodes/Block";
import type Borrow from "../nodes/Borrow";
import type Cell from "../nodes/Cell";
import type Column from "../nodes/Column";
import type Conditional from "../nodes/Conditional";
import type ConversionDefinition from "../nodes/ConversionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";
import type StructureType from "../nodes/StructureType";
import type Delete from "../nodes/Delete";
import type Docs from "../nodes/Docs";
import type Evaluate from "../nodes/Evaluate";
import type Expression from "../nodes/Expression";
import type { default as Func } from "../nodes/FunctionDefinition";
import type FunctionType from "../nodes/FunctionType";
import type Insert from "../nodes/Insert";
import type ListAccess from "../nodes/ListAccess";
import type Name from "../nodes/Name";
import type NameType from "../nodes/NameType";
import type Row from "../nodes/Row";
import type Select from "../nodes/Select";
import type SetOrMapAccess from "../nodes/SetOrMapAccess";
import type SetOrMapLiteral from "../nodes/SetOrMapLiteral";
import type Share from "../nodes/Share";
import type Reaction from "../nodes/Reaction";
import type TableType from "../nodes/TableType";
import type Type from "../nodes/Type";
import type TypeVariable from "../nodes/TypeVariable";
import type Unparsable from "../nodes/Unparsable";
import type Update from "../nodes/Update";
import { parse } from "./Parser";
import type MeasurementLiteral from "../nodes/MeasurementLiteral";

export default abstract class Conflict {
    readonly #minor: boolean;
    constructor(minor: boolean) { this.#minor = minor; }
    isMinor() { return this.#minor; }
    toString() { return this.constructor.name; }
}

export class UnparsableConflict extends Conflict {
    readonly unparsable: Unparsable;
    constructor(unparsable: Unparsable) {
        super(false);
        this.unparsable = unparsable;
    }
}

export class UnknownProperty extends Conflict {
    readonly access: AccessName;
    constructor(access: AccessName) {
        super(false);
        this.access = access;
    }
}

export class UnknownName extends Conflict {
    readonly name: Name;
    constructor(name: Name) {
        super(false);
        this.name = name;
    }
}

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Name;
    constructor(name: Name) {
        super(false);
        this.name = name;
    }
}

export class IncompatibleOperand extends Conflict {
    readonly expr: Expression;
    readonly receivedType: Type | undefined;
    readonly expectedType: Type;
    constructor(expr: Expression, receivedType: Type | undefined, expectedType: Type) {
        super(false);
        this.expr = expr;
        this.receivedType = receivedType;
        this.expectedType = expectedType;
    }

    toString() {
        return `${super.toString()} ${this.expr.toWordplay().trim()}: received ${this.receivedType?.toWordplay()}, expected ${this.expectedType.toWordplay()}`;
    }
}

export class IncompatibleUnits extends Conflict {
    readonly binary: BinaryOperation;
    readonly left: Type;
    readonly right: Type;
    constructor(binary: BinaryOperation, left: Type, right: Type) {
        super(false);
        this.binary = binary;
        this.left = left;
        this.right = right;
    }
    toString() {
        return `${super.toString()} ${this.binary.toWordplay()}: (${this.left.toWordplay()}) ≠ (${this.right.toWordplay()})`;
    }
}

export class LeftToRightOrderOfOperations extends Conflict {
    readonly binary: BinaryOperation;
    constructor(binary: BinaryOperation) {
        super(true);
        this.binary = binary;
    }
}

export class DuplicateAliases extends Conflict {
    readonly bind: Bind;
    constructor(bind: Bind) {
        super(false);
        this.bind = bind;
    }
}

export class DuplicateInputNames extends Conflict {
    readonly func: StructureDefinition | Func;
    constructor(func: StructureDefinition | Func) {
        super(false);
        this.func = func;
    }
}

export class DuplicateTypeVariables extends Conflict {
    readonly func: StructureDefinition | Func;
    constructor(func: StructureDefinition | Func) {
        super(false);
        this.func = func;
    }
}

export class RequiredAfterOptional extends Conflict {
    readonly func: Func | StructureDefinition;
    constructor(func: Func | StructureDefinition) {
        super(false);
        this.func = func;
    }
}

export class IncompatibleBind extends Conflict {
    readonly type: Type;
    readonly value: Expression;
    constructor(type: Type, value: Expression) {
        super(false);
        this.type = type;
        this.value = value;
    }
}

export class NotAFunction extends Conflict {
    readonly evaluate: Evaluate;
    readonly received: Type
    constructor(evaluate: Evaluate, received: Type) {
        super(false);
        this.evaluate = evaluate;
        this.received = received;
    }

    toString() {
        return `${super.toString()}: ${this.evaluate.func.toWordplay().trim()} was ${this.received.toWordplay()}`;
    }
}

export class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    constructor(evaluate: Evaluate) {
        super(false);
        this.evaluate = evaluate;
    }
}

export class IncompatibleInputs extends Conflict {
    readonly func: FunctionType | StructureType;
    readonly evaluate: Evaluate;
    constructor(func: FunctionType | StructureType, evaluate: Evaluate) {
        super(false);
        this.func = func;
        this.evaluate = evaluate;
    }
}


export class DuplicateBinds extends Conflict {
    readonly bind: Bind;
    readonly duplicates: (Expression | Bind | TypeVariable)[];
    constructor(bind: Bind, duplicates: (Expression | Bind | TypeVariable)[]) {
        super(false);
        this.bind = bind;
        this.duplicates = duplicates;
    }
}

export class UnusedBind extends Conflict {
    readonly bind: Bind;
    constructor(bind: Bind) {
        super(true);
        this.bind = bind;
    }
}

export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;
    constructor(borrow: Borrow) {
        super(false);
        this.borrow = borrow;
    }
    toString() {
        return super.toString() + " " + this.borrow.name.text;
    }
}

export class DuplicateLanguages extends Conflict {
    readonly docs: Docs[];
    constructor(docs: Docs[]) {
        super(false);
        this.docs = docs;
    }
}

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;
    constructor(conversion: ConversionDefinition) {
        super(false);
        this.conversion = conversion;
    }
}

export class UnknownConversion extends Conflict {
    readonly expr: Expression;
    readonly expectedType: Type;
    constructor(expr: Expression, expectedType: Type) {
        super(false);
        this.expr = expr;
        this.expectedType = expectedType;
    }
}

export class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional;
    constructor(conditional: Conditional) {
        super(false);
        this.conditional = conditional;
    }
}

export class NotATable extends Conflict {
    readonly op: Insert | Select | Delete | Update;
    constructor(op: Insert | Select | Delete | Update) {
        super(false);
        this.op = op;
    }
}

export class NonBooleanQuery extends Conflict {
    readonly op: Select | Delete | Update;
    constructor(op: Select | Delete | Update) {
        super(false);
        this.op = op;
    }
}

export class MissingColumns extends Conflict {
    readonly insert: Insert;
    constructor(insert: Insert) {
        super(false);
        this.insert = insert;
    }
}

export class ExpectedUpdateBind extends Conflict {
    readonly cell: Cell;
    constructor(cell: Cell) {
        super(false);
        this.cell = cell;
    }
}

export class IncompatibleCellType extends Conflict {
    readonly type: TableType;
    readonly cell: Cell;
    constructor(type: TableType, cell: Cell) {
        super(false);
        this.type = type;
        this.cell = cell;
    }
}

export class ExpectedSelectName extends Conflict {
    readonly cell: Cell;
    constructor(cell: Cell) {
        super(false);
        this.cell = cell;
    }
}

export class UnknownColumn extends Conflict {
    readonly type: TableType;
    readonly cell: Cell;
    constructor(type: TableType, cell: Cell) {
        super(false);
        this.type = type;
        this.cell = cell;
    }
}

export class ExpectedColumnType extends Conflict {
    readonly column: Column;
    constructor(column: Column) {
        super(false);
        this.column = column;
    }
}

export class MissingCells extends Conflict {
    readonly row: Row;
    constructor(row: Row) {
        super(false);
        this.row = row;
    }
}

export class MisplacedShare extends Conflict {
    readonly share: Share;
    constructor(share: Share) {
        super(false);
        this.share = share;
    }
}

export class MissingShareLanguages extends Conflict {
    readonly share: Share;
    constructor(share: Share) {
        super(false);
        this.share = share;
    }
}

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    constructor(name: NameType) {
        super(false);
        this.name = name;
    }
}

export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;
    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }
    toString() {
        return `${super.toString()} ${this.access.toWordplay()}: ${this.expected.toWordplay()} ≠ ${this.received.toWordplay()}`;
    }
}

export class NotAStream extends Conflict {
    readonly stream: Reaction;
    constructor(stream: Reaction) {
        super(false);
        this.stream = stream;
    }
}

export class IncompatibleStreamValues extends Conflict {
    readonly stream: Reaction;
    constructor(stream: Reaction) {
        super(false);
        this.stream = stream;
    }
}

export class NotASetOrMap extends Conflict {
    readonly set: SetOrMapLiteral;
    constructor(set: SetOrMapLiteral) {
        super(false);
        this.set = set;
    }
}

export class NotAListIndex extends Conflict {
    readonly access: ListAccess;
    constructor(access: ListAccess) {
        super(false);
        this.access = access;
    }
}

export class IgnoredExpression extends Conflict {
    readonly expr: Expression;
    constructor(expr: Expression) {
        super(false);
        this.expr = expr;
    }
}

export class ExpectedBindValue extends Conflict {
    readonly bind: Bind;
    constructor(bind: Bind) {
        super(false);
        this.bind = bind;
    }
}

export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;
    constructor(block: Block) {
        super(false);
        this.block = block;
    }
}

export class NotANumber extends Conflict {
    readonly measurement: MeasurementLiteral;
    constructor(measurement: MeasurementLiteral) {
        super(false);
        this.measurement = measurement;
    }
}

export function testConflict(goodCode: string, badCode: string, nodeType: Function, conflictType: Function, nodeIndex:number=0) {

    const goodProgram = parse(goodCode);
    const goodOp = goodProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(goodOp?.getConflicts({ program: goodProgram }).filter(n => n instanceof conflictType)).toHaveLength(0);

    const badProgram = parse(badCode);
    const badOp = badProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(badOp).toBeInstanceOf(nodeType);
    expect(badOp?.getConflicts({ program: badProgram }).find(c => c instanceof conflictType)).toBeInstanceOf(conflictType);

}