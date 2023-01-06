import type Context from '../nodes/Context';
import type Dimension from '../nodes/Dimension';
import type ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type Token from '../nodes/Token';
import TokenType from '../nodes/TokenType';
import type UnknownType from '../nodes/UnknownType';
import type Translation from './Translation';
import type ListType from '../nodes/ListType';
import type MapType from '../nodes/MapType';
import type MeasurementLiteral from '../nodes/MeasurementLiteral';
import type NameType from '../nodes/NameType';
import type Reference from '../nodes/Reference';
import type SetType from '../nodes/SetType';
import type StreamType from '../nodes/StreamType';
import type UnionType from '../nodes/UnionType';
import {
    AND_SYMBOL,
    OR_SYMBOL,
    NOT_SYMBOL,
    PRODUCT_SYMBOL,
    THIS_SYMBOL,
} from '../parser/Symbols';
import type { Description } from './Translation';
import type { CycleType } from '../nodes/CycleType';
import type UnknownNameType from '../nodes/UnknownNameType';
import type Type from '../nodes/Type';
import LinkedDescription from './LinkedDescription';

const WRITE_DOC = 'TBD';

const eng_serious: Translation = {
    language: 'eng',
    style: 'cs',
    placeholders: {
        code: 'code',
        expression: 'value',
        type: 'type',
    },
    data: {
        value: 'value',
        text: 'text',
        boolean: 'boolean',
        map: 'map',
        measurement: 'number',
        function: 'function',
        exception: 'exception',
        table: 'table',
        none: 'none',
        list: 'list',
        stream: 'stream',
        structure: 'structure',
        index: 'index',
        query: 'query',
        row: 'row',
        set: 'set',
        key: 'key',
    },
    evaluation: {
        unevaluated: 'the selected node did not evaluate',
        done: 'done evaluating',
    },
    nodes: {
        Dimension: {
            description: (dimension: Dimension) => {
                const dim = dimension.getName();
                return (
                    {
                        pm: 'picometers',
                        nm: 'nanometers',
                        µm: 'micrometers',
                        mm: 'millimeters',
                        m: 'meters',
                        cm: 'centimeters',
                        dm: 'decimeters',
                        km: 'kilometers',
                        Mm: 'megameters',
                        Gm: 'gigameters',
                        Tm: 'terameters',
                        mi: 'miles',
                        in: 'inches',
                        ft: 'feet',
                        ms: 'milliseconds',
                        s: 'seconds',
                        min: 'minutes',
                        hr: 'hours',
                        day: 'days',
                        wk: 'weeks',
                        yr: 'years',
                        g: 'grams',
                        mg: 'milligrams',
                        kg: 'kilograms',
                        oz: 'ounces',
                        lb: 'pounds',
                        pt: 'font size',
                    }[dim] ?? dim
                );
            },
            purpose: WRITE_DOC,
        },
        Doc: {
            description: 'documentation',
            purpose: WRITE_DOC,
        },
        Docs: {
            description: 'a set of documentation',
            purpose: WRITE_DOC,
        },
        KeyValue: {
            description: 'a key/value pair',
            purpose: WRITE_DOC,
        },
        Language: {
            description: 'a language tag',
            purpose: WRITE_DOC,
        },
        Name: {
            description: 'a name',
            purpose: WRITE_DOC,
        },
        Names: {
            description: 'a list of names',
            purpose: WRITE_DOC,
        },
        Row: {
            description: 'a row of values',
            purpose: WRITE_DOC,
        },
        Token: {
            description: (token: Token) =>
                token.is(TokenType.NAME)
                    ? 'a name'
                    : token.is(TokenType.BINARY_OP) ||
                      token.is(TokenType.UNARY_OP)
                    ? 'an operator'
                    : token.is(TokenType.DOCS)
                    ? 'documentation'
                    : token.is(TokenType.JAPANESE) ||
                      token.is(TokenType.ROMAN) ||
                      token.is(TokenType.NUMBER) ||
                      token.is(TokenType.PI) ||
                      token.is(TokenType.INFINITY)
                    ? 'a number'
                    : token.is(TokenType.SHARE)
                    ? 'share'
                    : 'a token',
            purpose: WRITE_DOC,
        },
        TypeInputs: {
            description: 'a list of type inputs',
            purpose: WRITE_DOC,
        },
        TypeVariable: {
            description: 'a type variable',
            purpose: WRITE_DOC,
        },
        TypeVariables: {
            description: 'a list of type variables',
            purpose: WRITE_DOC,
        },
    },
    expressions: {
        BinaryOperation: {
            description: 'evaluate unknown function two inputs',
            purpose: WRITE_DOC,
            right: 'input',
            start: '(left) first',
            finish: 'evaluate (operator) on (1) with (2)',
        },
        Bind: {
            description: 'name a value',
            purpose: WRITE_DOC,
            start: 'evaluate (value) first',
            finish: 'name (1) (name)',
        },
        Block: {
            description: 'block',
            purpose: WRITE_DOC,
            statement: 'statement',
            start: 'start evaluating the statements',
            finish: 'evaluate to the final value, (1)',
        },
        BooleanLiteral: {
            description: '(value)',
            purpose: WRITE_DOC,
            start: 'evaluate to (value)',
        },
        Borrow: {
            description: 'borrow a named value',
            purpose: WRITE_DOC,
            start: 'borrow (name) from (source)',
            source: 'source',
            name: 'name',
            version: 'version',
        },
        Changed: {
            description: 'check if stream caused evaluation',
            purpose: WRITE_DOC,
            start: 'check if (1) caused evaluation',
            stream: 'stream',
        },
        Conditional: {
            description: 'if (condition) is true, (yes), otherwise (no)',
            purpose: WRITE_DOC,
            start: 'check (condition) first',
            finish: 'evaluated to (1)',
            condition: 'condition',
            yes: 'yes',
            no: 'no',
        },
        ConversionDefinition: {
            description: 'define a conversion from one type to another',
            purpose: WRITE_DOC,
            start: 'conversion from (input) to (output) defined',
        },
        Convert: {
            description: 'convert a value to a different type',
            purpose: WRITE_DOC,
            start: 'find a series of conversions from (expression) to (type)',
            finish: 'converted to (1)',
        },
        Delete: {
            description: 'delete a row from a table',
            purpose: WRITE_DOC,
            start: 'evaluate the table first',
            finish: 'evaluated to new table, (1)',
        },
        DocumentedExpression: {
            description: 'a documented expression',
            purpose: WRITE_DOC,
            start: 'evaluate the documented expression',
        },
        Evaluate: {
            description: 'evaluate a function',
            purpose: WRITE_DOC,
            start: 'evaluate the inputs first',
            finish: 'evaluated to (1)',
            function: 'function',
            input: 'input',
        },
        ExpressionPlaceholder: {
            description: (
                node: ExpressionPlaceholder,
                translation: Translation,
                context: Context
            ) =>
                node.type
                    ? node.type.getDescription(translation, context)
                    : 'expression placeholder',
            purpose: WRITE_DOC,
            start: "halting, can't evaluate a placeholder",
            placeholder: 'expression',
        },
        FunctionDefinition: {
            description: 'a function',
            purpose: WRITE_DOC,
            start: 'define this function',
        },
        HOF: {
            description: 'a higher order function',
            purpose: WRITE_DOC,
            start: 'start evaluating',
            finish: 'finish evaluating',
        },
        Insert: {
            description: 'insert a row from a table',
            purpose: WRITE_DOC,
            start: 'evaluate the table first',
            finish: 'evaluated to new table, (1)',
        },
        Is: {
            description: 'check if value is type',
            purpose: WRITE_DOC,
            start: 'get the value',
            finish: 'check if (1) is (type)',
        },
        ListAccess: {
            description: 'get a value in a list',
            purpose: WRITE_DOC,
            start: 'evaluate (list)',
            finish: 'evaluated to (1)',
        },
        ListLiteral: {
            description: 'a list of values',
            purpose: WRITE_DOC,
            start: 'evaluate each item',
            finish: 'evaluated to (1)',
            item: 'item',
        },
        MapLiteral: {
            description: 'a list of mappings from keys to values',
            purpose: WRITE_DOC,
            start: 'evaluate each key and value',
            finish: 'evaluated to (1)',
        },
        MeasurementLiteral: {
            description: (node: MeasurementLiteral) =>
                node.number.is(TokenType.PI)
                    ? 'pi'
                    : node.number.is(TokenType.INFINITY)
                    ? 'infinity'
                    : node.unit.isUnitless()
                    ? 'a number'
                    : 'a number with a unit',
            purpose: WRITE_DOC,
            start: 'evaluate to (value)',
        },
        NativeExpression: {
            description: 'a native expression',
            purpose: WRITE_DOC,
            start: 'evaluate the expression',
        },
        NoneLiteral: {
            description: 'nothing',
            purpose: WRITE_DOC,
            start: 'evalute to nothing',
        },
        Previous: {
            description: 'a previous stream value',
            purpose: WRITE_DOC,
            start: 'first get (stream)',
            finish: 'evaluated to (1)',
        },
        Program: {
            description: 'a program',
            purpose: WRITE_DOC,
            start: 'first evaluate borrows',
            finish: 'evaluated to (1)',
        },
        PropertyReference: {
            description: 'a property on a structure',
            purpose: WRITE_DOC,
            start: 'first get (structure)',
            finish: 'evaluated to (1)',
            property: 'property',
        },
        Reaction: {
            description: 'a reaction to a stream change',
            purpose: WRITE_DOC,
            start: 'first check if the stream has changed',
            finish: 'the next stream value is (1)',
            initial: 'initial',
            next: 'next',
        },
        Reference: {
            description: (
                node: Reference,
                translation: Translation,
                context: Context
            ) =>
                node.resolve(context)?.getDescription(translation, context) ??
                node.getName(),
            purpose: WRITE_DOC,
            start: 'resolve (name)',
        },
        Select: {
            description: 'select rows from a table',
            purpose: WRITE_DOC,
            start: 'first get (table)',
            finish: 'evaluated to rows (1)',
        },
        SetLiteral: {
            description: 'a set of unique values',
            purpose: WRITE_DOC,
            start: 'evaluate each value',
            finish: 'evaluated to (1)',
        },
        SetOrMapAccess: {
            description: 'get a value from a set or map',
            purpose: WRITE_DOC,
            start: 'get the set or map first',
            finish: 'evaluated to (1)',
        },
        Source: {
            description: 'a named program',
            purpose: WRITE_DOC,
        },
        StructureDefinition: {
            description: 'a structure definition',
            purpose: WRITE_DOC,
            start: 'define the structure',
        },
        TableLiteral: {
            description: 'a table',
            purpose: WRITE_DOC,
            start: 'first evaluate the rows',
            finish: 'evaluated to (1)',
        },
        Template: {
            description: 'a text template',
            purpose: WRITE_DOC,
            start: 'evaluate each expression',
            finish: 'evaluated to (1)',
        },
        TextLiteral: {
            description: 'some text',
            purpose: WRITE_DOC,
            start: 'evaluate to the text',
        },
        This: {
            description: 'get the structure evaluting this',
            purpose: WRITE_DOC,
            start: 'evaluated to (1)',
        },
        UnaryOperation: {
            description: 'evaluate function ',
            purpose: WRITE_DOC,
            start: 'evaluate the value first',
            finish: 'evaluated to (1)',
        },
        UnparsableExpression: {
            purpose: WRITE_DOC,
            description: 'sequence of words',
            start: "can't evaluate unparsable code, stopping",
        },
        Update: {
            description: 'update rows in a table',
            purpose: WRITE_DOC,
            start: 'first get (table)',
            finish: 'evaluated to new table (1)',
        },
    },
    types: {
        AnyType: {
            description: 'any type',
            purpose: WRITE_DOC,
        },
        BooleanType: {
            description: 'boolean',
            purpose: WRITE_DOC,
        },
        ConversionType: {
            description: 'a conversion function type',
            purpose: WRITE_DOC,
        },
        ExceptionType: {
            description: 'an exception',
            purpose: WRITE_DOC,
        },
        FunctionDefinitionType: {
            description: 'a type of function',
            purpose: WRITE_DOC,
        },
        FunctionType: {
            description: 'a type of function',
            purpose: WRITE_DOC,
        },
        ListType: {
            description: (
                node: ListType,
                translation: Translation,
                context: Context
            ) =>
                node.type === undefined
                    ? 'a list type'
                    : `a list of type ${node.type.getDescription(
                          translation,
                          context
                      )}`,
            purpose: WRITE_DOC,
        },
        MapType: {
            description: (
                node: MapType,
                translation: Translation,
                context: Context
            ) =>
                node.key === undefined || node.value === undefined
                    ? 'a map type'
                    : `a map of type ${node.key.getDescription(
                          translation,
                          context
                      )} to ${node.value.getDescription(translation, context)}`,
            purpose: WRITE_DOC,
        },
        MeasurementType: {
            description: () => 'a number',
            purpose: WRITE_DOC,
        },
        NameType: {
            description: (node: NameType) => `a ${node.name.getText()}`,
            purpose: WRITE_DOC,
        },
        NeverType: {
            description: 'an impossible type',
            purpose: WRITE_DOC,
        },
        NoneType: {
            description: 'a nothing type',
            purpose: WRITE_DOC,
        },
        SetType: {
            description: (
                node: SetType,
                translation: Translation,
                context: Context
            ) =>
                node.key === undefined
                    ? 'a set type'
                    : `a set of type ${node.key.getDescription(
                          translation,
                          context
                      )}`,
            purpose: WRITE_DOC,
        },
        StreamType: {
            description: (
                node: StreamType,
                translation: Translation,
                context: Context
            ) =>
                `a stream of type ${node.type.getDescription(
                    translation,
                    context
                )}`,
            purpose: WRITE_DOC,
        },
        StructureDefinitionType: {
            description: 'a type of structure',
            purpose: WRITE_DOC,
        },
        UnknownType: {
            description: (
                node: UnknownType<any>,
                translation: Translation,
                context: Context
            ) => {
                return `unknown, because ${node
                    .getReasons()
                    .map((unknown) => unknown.getReason(translation, context))
                    .join(', because ')}`;
            },
            purpose: WRITE_DOC,
        },
        TableType: {
            description: 'a type of table',
            purpose: WRITE_DOC,
        },
        TextType: {
            description: 'text type',
            purpose: WRITE_DOC,
        },
        TypePlaceholder: {
            description: 'a placeholder type',
            purpose: WRITE_DOC,
        },
        UnionType: {
            description: (
                node: UnionType,
                translation: Translation,
                context: Context
            ) =>
                `${node.left.getDescription(
                    translation,
                    context
                )}${OR_SYMBOL}${node.right.getDescription(
                    translation,
                    context
                )}`,
            purpose: WRITE_DOC,
        },
        Unit: {
            description: (node, translation, context) =>
                node.exponents.size === 0
                    ? 'a number'
                    : node.numerator.length === 1 &&
                      node.denominator.length === 0
                    ? node.numerator[0].getDescription(translation, context)
                    : node.toWordplay() === 'm/s'
                    ? 'velocity'
                    : 'a number with unit',
            purpose: WRITE_DOC,
        },
        UnparsableType: {
            description: 'an unparsable type',
            purpose: WRITE_DOC,
        },
        VariableType: {
            description: 'a variable type',
            purpose: WRITE_DOC,
        },
        CycleType: {
            description: (node: CycleType) =>
                `${node.expression.toWordplay()} depends on itself`,
            purpose: WRITE_DOC,
        },
        UnknownVariableType: {
            description: "this type variable couldn't be inferred",
            purpose: WRITE_DOC,
        },
        NotAListType: {
            description: 'not a list',
            purpose: WRITE_DOC,
        },
        NoExpressionType: {
            description: 'there was no expression given',
            purpose: WRITE_DOC,
        },
        NotAFunctionType: {
            description: 'not a function',
            purpose: WRITE_DOC,
        },
        NotATableType: {
            description: 'not a table',
            purpose: WRITE_DOC,
        },
        NotAStreamType: {
            description: 'not a stream',
            purpose: WRITE_DOC,
        },
        NotASetOrMapType: {
            description: 'not a set or map',
            purpose: WRITE_DOC,
        },
        NotEnclosedType: {
            description: 'not in a structure, conversion, or reaction',
            purpose: WRITE_DOC,
        },
        NotImplementedType: {
            description: 'not implemented',
            purpose: WRITE_DOC,
        },
        UnknownNameType: {
            description: (node: UnknownNameType) =>
                node.name === undefined
                    ? "a name wasn't given"
                    : `${node.name.getText()} isn't defined`,
            purpose: WRITE_DOC,
        },
    },
    native: {
        bool: {
            doc: WRITE_DOC,
            name: 'bool',
            function: {
                and: {
                    doc: WRITE_DOC,
                    name: [AND_SYMBOL, 'and'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                or: {
                    doc: WRITE_DOC,
                    name: [OR_SYMBOL, 'or'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                not: {
                    doc: WRITE_DOC,
                    name: NOT_SYMBOL,
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                notequal: {
                    doc: WRITE_DOC,
                    name: ['≠'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
            },
        },
        none: {
            doc: WRITE_DOC,
            name: 'none',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
            },
        },
        text: {
            doc: WRITE_DOC,
            name: 'text',
            function: {
                length: {
                    doc: WRITE_DOC,
                    name: 'length',
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
                number: WRITE_DOC,
            },
        },
        measurement: {
            doc: WRITE_DOC,
            name: 'number',
            function: {
                add: {
                    doc: WRITE_DOC,
                    name: ['+', 'add'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                subtract: {
                    doc: WRITE_DOC,
                    name: ['-', 'subtract'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                multiply: {
                    doc: WRITE_DOC,
                    name: [PRODUCT_SYMBOL, 'multiply'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                divide: {
                    doc: WRITE_DOC,
                    name: ['÷', 'divide'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                remainder: {
                    doc: WRITE_DOC,
                    name: ['%', 'remainder'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                power: {
                    doc: WRITE_DOC,
                    name: ['^', 'power'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                root: {
                    doc: WRITE_DOC,
                    name: ['√', 'root'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                lessThan: {
                    doc: WRITE_DOC,
                    name: ['<', 'lessthan'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                lessOrEqual: {
                    doc: WRITE_DOC,
                    name: ['≤', 'lessorequal'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                greaterThan: {
                    doc: WRITE_DOC,
                    name: ['>', 'greaterthan'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                greaterOrEqual: {
                    doc: WRITE_DOC,
                    name: ['≥', 'greaterorequal'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                equal: {
                    doc: WRITE_DOC,
                    name: ['=', 'equal'],
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                notequal: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'number' }],
                },
                cos: {
                    doc: WRITE_DOC,
                    name: ['cos', 'cosine'],
                    inputs: [],
                },
                sin: {
                    doc: WRITE_DOC,
                    name: ['sin', 'sine'],
                    inputs: [],
                },
            },
            conversion: {
                text: WRITE_DOC,
                list: WRITE_DOC,
                s2m: WRITE_DOC,
                s2h: WRITE_DOC,
                s2day: WRITE_DOC,
                s2wk: WRITE_DOC,
                s2year: WRITE_DOC,
                s2ms: WRITE_DOC,
                ms2s: WRITE_DOC,
                min2s: WRITE_DOC,
                h2s: WRITE_DOC,
                day2s: WRITE_DOC,
                wk2s: WRITE_DOC,
                yr2s: WRITE_DOC,
                m2pm: WRITE_DOC,
                m2nm: WRITE_DOC,
                m2micro: WRITE_DOC,
                m2mm: WRITE_DOC,
                m2cm: WRITE_DOC,
                m2dm: WRITE_DOC,
                m2km: WRITE_DOC,
                m2Mm: WRITE_DOC,
                m2Gm: WRITE_DOC,
                m2Tm: WRITE_DOC,
                pm2m: WRITE_DOC,
                nm2m: WRITE_DOC,
                micro2m: WRITE_DOC,
                mm2m: WRITE_DOC,
                cm2m: WRITE_DOC,
                dm2m: WRITE_DOC,
                km2m: WRITE_DOC,
                Mm2m: WRITE_DOC,
                Gm2m: WRITE_DOC,
                Tm2m: WRITE_DOC,
                km2mi: WRITE_DOC,
                mi2km: WRITE_DOC,
                cm2in: WRITE_DOC,
                in2cm: WRITE_DOC,
                m2ft: WRITE_DOC,
                ft2m: WRITE_DOC,
                g2mg: WRITE_DOC,
                mg2g: WRITE_DOC,
                g2kg: WRITE_DOC,
                kg2g: WRITE_DOC,
                g2oz: WRITE_DOC,
                oz2g: WRITE_DOC,
                oz2lb: WRITE_DOC,
                lb2oz: WRITE_DOC,
            },
        },
        list: {
            doc: WRITE_DOC,
            name: 'list',
            kind: 'Kind',
            out: 'Result',
            outofbounds: 'outofbounds',
            function: {
                add: {
                    doc: WRITE_DOC,
                    name: 'add',
                    inputs: [{ doc: WRITE_DOC, name: 'item' }],
                },
                length: {
                    doc: WRITE_DOC,
                    name: 'length',
                    inputs: [],
                },
                random: {
                    doc: WRITE_DOC,
                    name: 'random',
                    inputs: [],
                },
                first: {
                    doc: WRITE_DOC,
                    name: 'first',
                    inputs: [],
                },
                last: {
                    doc: WRITE_DOC,
                    name: 'last',
                    inputs: [],
                },
                has: {
                    doc: WRITE_DOC,
                    name: 'has',
                    inputs: [{ doc: WRITE_DOC, name: 'item' }],
                },
                join: {
                    doc: WRITE_DOC,
                    name: 'join',
                    inputs: [{ doc: WRITE_DOC, name: 'separator' }],
                },
                sansFirst: {
                    doc: WRITE_DOC,
                    name: 'sansFirst',
                    inputs: [],
                },
                sansLast: {
                    doc: WRITE_DOC,
                    name: 'sansLast',
                    inputs: [],
                },
                sans: {
                    doc: WRITE_DOC,
                    name: 'sans',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                sansAll: {
                    doc: WRITE_DOC,
                    name: 'sansAll',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                reverse: {
                    doc: WRITE_DOC,
                    name: 'reverse',
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'list' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'list' }],
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, name: 'translator' }],
                    value: { doc: WRITE_DOC, name: 'item' },
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    value: { doc: WRITE_DOC, name: 'item' },
                },
                all: {
                    doc: WRITE_DOC,
                    name: 'all',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    value: { doc: WRITE_DOC, name: 'item' },
                },
                until: {
                    doc: WRITE_DOC,
                    name: 'until',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    value: { doc: WRITE_DOC, name: 'item' },
                },
                find: {
                    doc: WRITE_DOC,
                    name: 'find',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    value: { doc: WRITE_DOC, name: 'item' },
                },
                combine: {
                    doc: WRITE_DOC,
                    name: 'combine',
                    inputs: [
                        { doc: WRITE_DOC, name: 'initial' },
                        { doc: WRITE_DOC, name: 'combined' },
                    ],
                    combination: { doc: WRITE_DOC, name: 'combination' },
                    next: { doc: WRITE_DOC, name: 'next' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                set: WRITE_DOC,
            },
        },
        set: {
            doc: WRITE_DOC,
            name: 'set',
            kind: 'Kind',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                add: {
                    doc: WRITE_DOC,
                    name: ['add', '+'],
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                remove: {
                    doc: WRITE_DOC,
                    name: ['remove', '-'],
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                union: {
                    doc: WRITE_DOC,
                    name: ['union', '∪'],
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                intersection: {
                    doc: WRITE_DOC,
                    name: ['intersection', '∩'],
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                difference: {
                    doc: WRITE_DOC,
                    name: 'difference',
                    inputs: [{ doc: WRITE_DOC, name: 'set' }],
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    value: { doc: WRITE_DOC, name: 'value' },
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, name: 'lisetst' }],
                    value: { doc: WRITE_DOC, name: 'value' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                list: WRITE_DOC,
            },
        },
        map: {
            doc: WRITE_DOC,
            name: 'map',
            key: 'Key',
            value: 'Value',
            result: 'Result',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                set: {
                    doc: WRITE_DOC,
                    name: 'set',
                    inputs: [
                        { doc: WRITE_DOC, name: 'key' },
                        { doc: WRITE_DOC, name: 'value' },
                    ],
                },
                unset: {
                    doc: WRITE_DOC,
                    name: 'unset',
                    inputs: [{ doc: WRITE_DOC, name: 'key' }],
                },
                remove: {
                    doc: WRITE_DOC,
                    name: 'remove',
                    inputs: [{ doc: WRITE_DOC, name: 'value' }],
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, name: 'checker' }],
                    key: { doc: WRITE_DOC, name: 'key' },
                    value: { doc: WRITE_DOC, name: 'value' },
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, name: 'translator' }],
                    key: { doc: WRITE_DOC, name: 'key' },
                    value: { doc: WRITE_DOC, name: 'value' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                set: WRITE_DOC,
                list: WRITE_DOC,
            },
        },
    },
    exceptions: {
        function: (node, type) =>
            LinkedDescription.with(
                'no function named ',
                node,
                ' in ',
                type === undefined ? ' scope' : type
            ),
        name: (node, scope) =>
            LinkedDescription.with(
                'nothing named ',
                node,
                ' in ',
                scope === undefined ? ' scope' : scope
            ),
        cycle: (node) => LinkedDescription.with(node, ' depends on itself'),
        functionlimit: (fun) =>
            LinkedDescription.with(
                'evaluated too many functions, especially ',
                fun
            ),
        steplimit: 'evaluated too many steps in this function',
        type: (expected, given) =>
            LinkedDescription.with(
                'expected ',
                expected,
                ' but received ',
                given
            ),
        placeholder: (node) =>
            LinkedDescription.with('this ', node, ' is not implemented'),
        unparsable: (node) =>
            LinkedDescription.with('this ', node, ' is not parsable'),
        value: (node) =>
            LinkedDescription.with(
                node,
                ' expected a value, but did not receive one'
            ),
    },
    conflict: {
        BorrowCycle: {
            primary: (cycle) =>
                `This borrow depends on ${cycle[0].getTranslation([
                    'eng',
                ])}${cycle
                    .slice(1)
                    .map((source) => `, which depends on ${source.getNames()}`)
                    .join('')}, which depends on ${cycle[0].getNames()}.`,
            secondary: () => '',
        },
        ReferenceCycle: {
            primary: () => `this depends on itself`,
        },
        DisallowedInputs: {
            primary: () => 'inputs on interfaces not allowed',
            secondary: () => "this isn't allowed",
        },
        DuplicateNames: {
            primary: () => `duplicate name`,
            secondary: () => 'duplicate',
        },
        DuplicateShare: {
            primary: () => `duplicate share`,
            secondary: () => `duplicate share`,
        },
        DuplicateTypeVariables: {
            primary: () => `duplicate type variable`,
            secondary: () => `duplicate type variable`,
        },
        ExpectedBooleanCondition: {
            primary: (type: Type) =>
                `expected boolean condition, received ${type.toWordplay()}`,
        },
        ExpectedColumnType: {
            primary: () => `columns require types`,
        },
        ExpectedEndingExpression: {
            primary: () => `blocks require an expression`,
        },
        ExpectedSelectName: {
            primary: () => `value required`,
        },
        ExpectedUpdateBind: {
            primary: () => `value required`,
        },
        IgnoredExpression: {
            primary: () => `unused expression`,
        },
        Implemented: {
            primary: () => `interfaces must implement all functions are none`,
            secondary: () =>
                `implementation not allowed unless all are implemented`,
        },
        IncompatibleBind: {
            primary: (types) =>
                `expected ${types[0].toWordplay()}, got ${types[1].toWordplay()}`,
            secondary: () => `didn't receive this type`,
        },
        IncompatibleCellType: {
            primary: (types) =>
                `expected ${types[0].toWordplay()}, received ${types[1].toWordplay()}`,
            secondary: () => `didn't receive this type`,
        },
        IncompatibleInput: {
            primary: (types) =>
                `expected input of type ${types[0].toWordplay()}, received ${types[1].toWordplay()}`,
            secondary: () => `didn't receive this type`,
        },
        IncompatibleKey: {
            primary: (types) =>
                `expected keys of type ${types.expected.toWordplay()}, received ${types.received.toWordplay()}`,
            secondary: () => ``,
        },
        IncompatibleType: {
            primary: (type) => `this can never be a ${type.toWordplay()}`,
            secondary: () => `this can never be`,
        },
        InvalidLanguage: {
            primary: () => `not a valid language code`,
            secondary: () => `expects a valid language code`,
        },
        InvalidRow: {
            primary: () => `all columns must be specified`,
            secondary: () => `all of these columns are required`,
        },
        InvalidTypeInput: {
            primary: () => `this type input isn't accepted by this`,
            secondary: () => `this doesn't accept this type input`,
        },
        MisplacedConversion: {
            primary: () => `conversions only allowed in structure definitions`,
        },
        MisplacedInput: {
            primary: () => `this input is out of the expected order`,
        },
        MisplacedShare: {
            primary: () => `shares only allowed at top level of program`,
            secondary: () => ``,
        },
        MisplacedThis: {
            primary: () =>
                `${THIS_SYMBOL} only allowed in structure definition or reaction`,
        },
        MissingCell: {
            primary: (column) =>
                `this row is missing column ${column.toWordplay()}.`,
            secondary: () => `this column is required`,
        },
        MissingInput: {
            primary: (input) =>
                `expected input ${input.names.getTranslation('eng')}`,
            secondary: () => `this input is required`,
        },
        MissingLanguage: {
            primary: () => `language code required`,
        },
        MissingShareLanguages: {
            primary: () => `shared code must specify language`,
        },
        NoExpression: {
            primary: () => `functions require expressions`,
        },
        NonBooleanQuery: {
            primary: () => `queries must be boolean`,
        },
        NotAFunction: {
            primary: ({ name, type }) =>
                `no function by name ${name} on type ${type.toWordplay()}`,
        },
        NotAList: {
            primary: (type) => `this is a ${type.toWordplay()}, not a list`,
        },
        NotAListIndex: {
            primary: (type) => `expected number, received ${type.toWordplay()}`,
        },
        NotAMap: {
            primary: () =>
                `expected only expressions or key/value pairs, not a mixture`,
            secondary: () => `expected this to be a key/value pair`,
        },
        NotANumber: {
            primary: () => `this number isn't formatted correctly`,
        },
        NotAnInterface: {
            primary: () => `structures can only implement interfaces`,
            secondary: () => `not an interface`,
        },
        NotASetOrMap: {
            primary: (type) =>
                `expected set or map, this is a ${type.toWordplay()}`,
        },
        NotAStream: {
            primary: (type) =>
                `expected a stream, this is a ${type.toWordplay()}`,
        },
        NotAStreamIndex: {
            primary: (type) => `expected number, received ${type.toWordplay()}`,
        },
        NotATable: {
            primary: (type) =>
                `expected a table, this is a ${type.toWordplay()}`,
        },
        NotInstantiable: {
            primary: () =>
                `can't make an interface with unimplemented functions`,
            secondary: () => `this isn't implemented`,
        },
        OrderOfOperations: {
            primary: () =>
                `operators evalute left to right, unlike math; use parentheses to specify order of evaluation`,
            secondary: () =>
                `this will be evaluated after, regardless of what type of operator it is`,
        },
        Placeholder: {
            primary: () =>
                `this is unimplemented; the program will stop if evaluated`,
        },
        RequiredAfterOptional: {
            primary: () => `required inputs cannot come after optional ones`,
        },
        UnclosedDelimiter: {
            primary: (token) => `expected ${token.getText()}`,
        },
        UnexpectedEtc: {
            primary: () =>
                `variable length inputs can only appear on function evaluations`,
        },
        UnexpectedInputs: {
            primary: () => `this has too many inputs`,
            secondary: () => `this input isn't expected`,
        },
        UnexpectedTypeVariable: {
            primary: () => `type inputs not allowed on type variables`,
        },
        UnimplementedInterface: {
            primary: (info) =>
                `this structure implements interface ${info.interface}, but doesn't implement function ${info.fun}`,
            secondary: () => ``,
        },
        UnknownBorrow: {
            primary: () => `unknown source and name`,
        },
        UnknownColumn: {
            primary: () => `unknown column in table`,
        },
        UnknownConversion: {
            primary: (types) =>
                `no conversion from ${types.in.toWordplay()} to ${types.out.toWordplay()}`,
        },
        UnknownInput: {
            primary: () => `no input by this name`,
        },
        UnknownName: {
            primary: (name) => `unknown name ${name}`,
        },
        UnknownProperty: {
            primary: () => `unknown property`,
        },
        UnknownTypeName: {
            primary: () => `unknown type`,
        },
        UnnamedAlias: {
            primary: () => `missing name`,
        },
        UnparsableConflict: {
            primary: (expression) =>
                expression
                    ? `expected expression, but couldn't parse one`
                    : `expected type, but couldn't parse one`,
        },
        UnusedBind: {
            primary: () => `unused name`,
        },
        InputListMustBeLast: {
            primary: () => `input list must be last`,
        },
    },
    step: {
        stream: 'keeping the stream instead of getting its latest value',
        jump: 'jumping past code',
        jumpif: (yes) => (yes ? 'jumping over code' : 'not jumping over code'),
        halt: 'encountered exception, stopping',
        initialize: 'preparing to process items',
        evaluate: 'starting evaluation',
        next: 'apply the function to the next item',
        check: 'check the result',
    },
    transform: {
        add: (node: Description) => ` add ${node}`,
        append: (node: Description) => `append ${node}`,
        remove: (node: Description) => `remove ${node}`,
        replace: (node: Description | undefined) =>
            `replace with ${node ?? 'nothing'}`,
    },
    ui: {
        tooltip: {
            play: 'evaluate the program fully',
            pause: 'evaluate the program one step at a time',
            back: 'step back one step',
            out: 'step out of this function',
            forward: "advance one step in the program's evaluation",
            present: 'advance to the present',
            reset: 'restart the evaluation of the project from the beginning.',
            home: 'return to the types menu',
        },
    },
    input: {
        random: {
            doc: WRITE_DOC,
            name: ['random', '🎲'],
        },
        mousebutton: {
            doc: WRITE_DOC,
            name: ['mousebutton', '🖱️'],
        },
        mouseposition: {
            doc: WRITE_DOC,
            name: ['mouseposition', '👆🏻'],
        },
        keyboard: {
            doc: WRITE_DOC,
            name: ['keyboard', '⌨️'],
        },
        time: {
            doc: WRITE_DOC,
            name: ['time', '🕕'],
        },
        microphone: {
            doc: WRITE_DOC,
            name: ['microphone', '🎤'],
        },
        reaction: {
            doc: WRITE_DOC,
            name: 'reaction',
        },
        key: {
            doc: WRITE_DOC,
            name: 'Key',
            key: {
                doc: WRITE_DOC,
                name: 'key',
            },
            down: {
                doc: WRITE_DOC,
                name: 'down',
            },
        },
    },
    output: {
        group: {
            definition: { doc: WRITE_DOC, name: 'Group' },
        },
        phrase: {
            definition: { doc: WRITE_DOC, name: ['Phrase', '💬'] },
            text: { doc: WRITE_DOC, name: 'text' },
            size: { doc: WRITE_DOC, name: 'size' },
            font: { doc: WRITE_DOC, name: 'font' },
            color: { doc: WRITE_DOC, name: 'color' },
            opacity: { doc: WRITE_DOC, name: 'opacity' },
            place: { doc: WRITE_DOC, name: 'place' },
            offset: { doc: WRITE_DOC, name: 'offset' },
            rotation: { doc: WRITE_DOC, name: 'rotation' },
            scalex: { doc: WRITE_DOC, name: 'scalex' },
            scaley: { doc: WRITE_DOC, name: 'scaley' },
            name: { doc: WRITE_DOC, name: 'name' },
            entry: { doc: WRITE_DOC, name: 'entry' },
            during: { doc: WRITE_DOC, name: 'during' },
            between: { doc: WRITE_DOC, name: 'between' },
            exit: { doc: WRITE_DOC, name: 'exit' },
        },
        pose: {
            definition: { doc: WRITE_DOC, name: 'Pose' },
            duration: { doc: WRITE_DOC, name: 'duration' },
            style: { doc: WRITE_DOC, name: 'style' },
            text: { doc: WRITE_DOC, name: 'text' },
            size: { doc: WRITE_DOC, name: 'size' },
            font: { doc: WRITE_DOC, name: 'font' },
            color: { doc: WRITE_DOC, name: 'color' },
            opacity: { doc: WRITE_DOC, name: 'opacity' },
            place: { doc: WRITE_DOC, name: 'place' },
            offset: { doc: WRITE_DOC, name: 'offset' },
            rotation: { doc: WRITE_DOC, name: 'rotation' },
            scalex: { doc: WRITE_DOC, name: 'scalex' },
            scaley: { doc: WRITE_DOC, name: 'scaley' },
        },
        color: {
            definition: { doc: WRITE_DOC, name: ['Color', '🌈'] },
            lightness: { doc: WRITE_DOC, name: ['lightness', 'l'] },
            chroma: { doc: WRITE_DOC, name: ['chroma', 'c'] },
            hue: { doc: WRITE_DOC, name: ['hue', 'h'] },
        },
        sequence: {
            definition: { doc: WRITE_DOC, name: 'Sequence' },
            count: { doc: WRITE_DOC, name: 'count' },
            poses: { doc: WRITE_DOC, name: 'poses' },
        },
        place: {
            definition: { doc: WRITE_DOC, name: ['Place', '📌'] },
            x: { doc: WRITE_DOC, name: 'x' },
            y: { doc: WRITE_DOC, name: 'y' },
            z: { doc: WRITE_DOC, name: 'z' },
        },
        row: {
            definition: { doc: WRITE_DOC, name: ['Row'] },
            description: WRITE_DOC,
            phrases: { doc: WRITE_DOC, name: 'phrases' },
        },
        stack: {
            definition: { doc: WRITE_DOC, name: 'Stack' },
            description: WRITE_DOC,
            phrases: { doc: WRITE_DOC, name: 'phrases' },
        },
        verse: {
            definition: { doc: WRITE_DOC, name: ['Verse', '🌎', '🌍', '🌏'] },
            description: WRITE_DOC,
            groups: { doc: WRITE_DOC, name: 'groups' },
            font: { doc: WRITE_DOC, name: 'font' },
            foreground: { doc: WRITE_DOC, name: 'foreground' },
            background: { doc: WRITE_DOC, name: 'background' },
            focus: { doc: WRITE_DOC, name: 'focus' },
            tilt: { doc: WRITE_DOC, name: 'tilt' },
        },
    },
};

export default eng_serious;
