import type Context from '@nodes/Context';
import type Dimension from '@nodes/Dimension';
import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import type UnknownType from '@nodes/UnknownType';
import type Translation from '../Translation';
import type ListType from '@nodes/ListType';
import type MapType from '@nodes/MapType';
import type MeasurementLiteral from '@nodes/MeasurementLiteral';
import type NameType from '@nodes/NameType';
import type Reference from '@nodes/Reference';
import type SetType from '@nodes/SetType';
import type StreamType from '@nodes/StreamType';
import type UnionType from '@nodes/UnionType';
import {
    AND_SYMBOL,
    OR_SYMBOL,
    NOT_SYMBOL,
    PRODUCT_SYMBOL,
    EXPONENT_SYMBOL,
    LANGUAGE_SYMBOL,
    COMMA_SYMBOL,
    PROPERTY_SYMBOL,
} from '@parser/Symbols';
import type { Description } from '../Translation';
import type { CycleType } from '@nodes/CycleType';
import type UnknownNameType from '@nodes/UnknownNameType';
import Explanation from '../Explanation';
import type NodeLink from '../NodeLink';
import type StreamDefinitionType from '../../nodes/StreamDefinitionType';

const WRITE_DOC = 'TBD';

const en: Translation = {
    language: 'en',
    style: 'cs',
    welcome: 'hello',
    placeholders: {
        code: 'code',
        expression: 'value',
        type: 'type',
    },
    terminology: {
        store: 'store',
        code: 'compute',
        decide: 'decide',
        project: 'project',
        input: 'input',
        output: 'output',
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
        streamdefinition: 'stream definition',
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
                    }[dim] ?? 'dimension'
                );
            },
            doc: `A unit of measurement.
            
                They can be combined using the product ${PRODUCT_SYMBOL}, power ${EXPONENT_SYMBOL}, and slash ${LANGUAGE_SYMBOL} symbols to construct compound units.`,
        },
        Doc: {
            description: 'documentation',
            doc: `
                Describes the purpose of some code.
                
                It can precede any expression, but is most useful before definitions to explain how to use them. 
                Documentation can be tagged with a language`,
        },
        Docs: {
            description: 'set of documentation',
            doc: `a list of documentation`,
        },
        KeyValue: {
            description: 'key/value pair',
            doc: `represents a single mapping in a map between a key and a value.`,
        },
        Language: {
            description: 'language tag',
            doc: `applied to a name or documentation to indicate the language it is written in.`,
        },
        Name: {
            description: 'name',
            doc: `
                Identifies code.
                
                names are used to represent some value in a program, such as a function, structure type, or a binding in a block. 
                They're a helpful way of giving a shorthand label to some value or way of computing or storing values. 
                Names can be optionally tagged with a language; this is helpful when sharing code, since the language might use to name a function might not be known to people who want to use it. 
                Translating names makes shared code more globally useful.`,
        },
        Names: {
            description: 'names list',
            doc: `
                Defines a list of names some code is known by.
                
                Names are separated by ${COMMA_SYMBOL} symbols. 
                Having multiple names is most helpful when you want to use multiple languages.
                `,
        },
        Row: {
            description: 'row',
            doc: `a row of values, matching a table definition`,
        },
        Token: {
            description: (token: Token) =>
                token.is(TokenType.NAME)
                    ? 'name'
                    : token.is(TokenType.BINARY_OP) ||
                      token.is(TokenType.UNARY_OP)
                    ? 'operator'
                    : token.is(TokenType.DOC)
                    ? 'documentation'
                    : token.is(TokenType.JAPANESE) ||
                      token.is(TokenType.ROMAN) ||
                      token.is(TokenType.NUMBER) ||
                      token.is(TokenType.PI) ||
                      token.is(TokenType.INFINITY)
                    ? 'number'
                    : token.is(TokenType.SHARE)
                    ? 'share'
                    : 'token',
            doc: 'the smallest group of symbols in a performance',
        },
        TypeInputs: {
            description: 'type inputs',
            doc: `a list of types given to a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariable: {
            description: 'type variable',
            doc: `a placeholder for a type used in a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariables: {
            description: 'type variables',
            doc: `a list of @TypeVariable`,
        },
        Paragraph: {
            description: 'paragraph',
            doc: `a formatted list of words, links, and example code`,
        },
        WebLink: {
            description: 'link',
            doc: `a link to something on the web`,
        },
        ConceptLink: {
            description: 'concept',
            doc: `a link to a concept in Wordplay`,
        },
        Words: {
            description: 'words',
            doc: `words that are part of @Doc`,
        },
        Example: {
            description: 'example',
            doc: `a program that illustrates how to use some code`,
        },
        BinaryOperation: {
            description: 'binary operation',
            doc: "Binary operations compute a left and right value and then compute the function indicated by the operator in the middle. The operator name must exist on the left value's type. This syntax is really just a special form of an Evaluate",
            right: 'input',
            start: (left) => Explanation.as('evaluating ', left, ' first'),
            finish: (result) =>
                Explanation.as('evaluated to ', result ?? ' nothing'),
        },
        Bind: {
            description: 'bind',
            doc: `Name a value for later use.
                
                In many programs, these are called 'variables', but unlike in other languages, a binding's value cannot change: once something is named, 
                it keeps the value it was assigned until the part of the program that defined it is complete, 
                and then the name is discarded.
                
                Binds are used in @Block to name values and in @FunctionDefinition and @StructureDefinition to define inputs.
                `,
            start: (value) =>
                value
                    ? Explanation.as('evaluate ', value, ' first')
                    : 'no value',
            finish: (value, names) =>
                value
                    ? Explanation.as('giving ', value, ' the name ', names)
                    : 'no value',
        },
        Block: {
            description: 'block',
            doc: `Name a series of values to evaluate a complex expression.
            
            Blocks usually are a series of bindings, culminating in an expression that produces a block's final value. They are a way to compute complex values without having to write one large complex expression.`,
            statement: 'statement',
            start: 'start evaluating the statements',
            finish: (value) =>
                Explanation.as('block evaluated to ', value ?? 'nothing'),
        },
        BooleanLiteral: {
            description: (literal) => (literal.bool() ? 'true' : 'false'),
            doc: `A single true or false value.`,
            start: (value) => Explanation.as('create a ', value),
        },
        Borrow: {
            description: 'borrow',
            doc: `Use a binding from another source file or project.`,
            start: (source, name) =>
                name === undefined && source === undefined
                    ? 'borrowing nothing'
                    : name === undefined && source !== undefined
                    ? Explanation.as('borrow ', source)
                    : Explanation.as(
                          'borrow ',
                          name ?? ' unspecified name ',
                          ' from ',
                          source ?? ' unspecified source'
                      ),
            source: 'source',
            bind: 'name',
            version: 'version',
        },
        Changed: {
            description: 'changed',
            doc: `true if a stream caused a program to re-evaluate`,
            start: (stream: NodeLink) =>
                Explanation.as(
                    'check if ',
                    stream,
                    ' caused this program to reevaluate'
                ),
            stream: 'stream',
        },
        Conditional: {
            description: 'conditional',
            doc: 'choose a value to compute based on a boolean',
            start: (condition) => Explanation.as('check ', condition, ' first'),
            finish: (value) =>
                Explanation.as(
                    'conditional evaluated to ',
                    value ?? ' nothing'
                ),
            condition: 'condition',
            yes: 'yes',
            no: 'no',
        },
        ConversionDefinition: {
            description: 'conversion',
            doc: `define a conversion from one value type to another`,
            start: 'define this conversion',
        },
        Convert: {
            description: 'convert',
            doc: `convert one type of value to another`,
            start: (expr) => Explanation.as('first evaluate ', expr),
            finish: (value) =>
                Explanation.as('converted to ', value ?? 'nothing'),
        },
        Delete: {
            description: 'delete',
            doc: `delete rows from a table`,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table without rows, ',
                    value ?? 'nothing'
                ),
        },
        DocumentedExpression: {
            description: 'a documented expression',
            doc: WRITE_DOC,
            start: 'evaluate the documented expression',
        },
        Evaluate: {
            description: 'evaluate a function',
            doc: WRITE_DOC,
            start: (inputs) =>
                inputs
                    ? 'evaluate the inputs first'
                    : 'get the function to evaluate',
            finish: (result) =>
                Explanation.as('function evaluated to ', result ?? 'nothing'),
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
            doc: WRITE_DOC,
            start: 'cannot evaluate a placeholder',
            placeholder: 'expression',
        },
        FunctionDefinition: {
            description: 'function',
            doc: `define a function that maps input values to an output value`,
            start: 'define this function',
        },
        HOF: {
            description: 'a higher order function',
            doc: WRITE_DOC,
            start: 'evaluating the function given',
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        Initial: {
            description: 'is initial evaluation',
            doc: WRITE_DOC,
        },
        Insert: {
            description: 'insert a row from a table',
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table new rows, ',
                    value ?? 'nothing'
                ),
        },
        Is: {
            description: 'true if a value is a specific type',
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate ', value, ' first'),
            finish: (is, type) =>
                is
                    ? Explanation.as('value is ', type, ', evaluating to true')
                    : Explanation.as(
                          'value is not ',
                          type,
                          ' evaluating to false'
                      ),
        },
        ListAccess: {
            description: 'get a value in a list',
            doc: WRITE_DOC,
            start: (list) => Explanation.as('evaluate ', list, ' first'),
            finish: (value) =>
                Explanation.as('item at index is ', value ?? 'nothing'),
        },
        ListLiteral: {
            description: (literal) =>
                literal.values.length === 0 ? 'empty list' : 'list of values',
            doc: WRITE_DOC,
            start: 'evaluate items first',
            finish: (value) =>
                Explanation.as('evaluated to list ', value ?? 'nothing'),
            item: 'item',
        },
        MapLiteral: {
            description: 'a list of mappings from keys to values',
            doc: WRITE_DOC,
            start: 'evaluate each key and value first',
            finish: (value) =>
                Explanation.as('evaluated to map ', value ?? 'nothing'),
        },
        MeasurementLiteral: {
            description: (node: MeasurementLiteral) =>
                node.number.getText() === 'π'
                    ? 'pi'
                    : node.number.getText() === '∞'
                    ? 'infinity'
                    : node.unit.isUnitless()
                    ? 'number'
                    : 'number with a unit',
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate to ', value),
        },
        NativeExpression: {
            description: 'a built-in expression',
            doc: WRITE_DOC,
            start: 'evaluate the built-in expression',
        },
        NoneLiteral: {
            description: 'nothing',
            doc: WRITE_DOC,
            start: 'create a nothing value',
        },
        Previous: {
            description: 'a previous stream value',
            doc: WRITE_DOC,
            start: (stream) => Explanation.as('first get ', stream),
            finish: (value) =>
                Explanation.as(
                    'evaluated to stream value ',
                    value ?? 'nothing'
                ),
        },
        Program: {
            description: 'a program',
            doc: WRITE_DOC,
            start: (changes) =>
                changes.length === 0
                    ? 'evaluating program for the first time'
                    : changes.length === 1
                    ? Explanation.as(
                          changes[0].stream,
                          ' produced ',
                          changes[0].value,
                          ' revaluating program'
                      )
                    : Explanation.as(
                          `${changes.length} streams changed (e.g., `,
                          changes[0].stream,
                          ' → ',
                          changes[0].value,
                          '); revaluating program'
                      ),
            finish: (value) =>
                Explanation.as('program evaluated to ', value ?? 'nothing'),
        },
        PropertyBind: {
            description: 'duplicate a structure with a new property value',
            doc: WRITE_DOC,
            start: 'get the structure',
            finish: (structure) =>
                structure
                    ? Explanation.as('created new structure ', structure)
                    : 'no structure created',
        },
        PropertyReference: {
            description: 'a property on a structure',
            doc: WRITE_DOC,
            start: 'first get the value',
            finish: (property, value) =>
                property
                    ? Explanation.as(
                          'property ',
                          property,
                          'is ',
                          value ?? 'nothing'
                      )
                    : 'no property name given, no value',
            property: 'property',
        },
        Reaction: {
            description: 'reaction',
            doc: `A reaction to a stream change.`,
            start: 'first check if the stream has changed',
            finish: (value) =>
                Explanation.as(
                    'the stream value is currently ',
                    value ?? 'nothing'
                ),
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
            doc: WRITE_DOC,
            start: (name) => Explanation.as('get the value of ', name),
        },
        Select: {
            description: 'select rows from a table',
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with the selected rows, ',
                    value ?? 'nothing'
                ),
        },
        SetLiteral: {
            description: 'a set of unique values',
            doc: WRITE_DOC,
            start: 'evaluate each value first',
            finish: (value) =>
                Explanation.as('evaluated to set ', value ?? 'nothing'),
        },
        SetOrMapAccess: {
            description: 'get a value from a set or map',
            doc: WRITE_DOC,
            start: (set) => Explanation.as('evaluate ', set, ' first'),
            finish: (value) =>
                Explanation.as('item in  with key is ', value ?? 'nothing'),
        },
        Source: {
            description: 'a named program',
            doc: WRITE_DOC,
        },
        StreamDefinition: {
            description: 'a stream definition',
            doc: `defines a stream of values.`,
            start: 'define this stream type',
        },
        StructureDefinition: {
            description: 'a structure definition',
            doc: `define a data structure that stores values and functions on those values.`,
            start: 'define this structure type',
        },
        TableLiteral: {
            description: 'a table',
            doc: WRITE_DOC,
            item: 'row',
            start: 'first evaluate the rows',
            finish: (table) =>
                Explanation.as('evaluated to new table ', table ?? 'nothing'),
        },
        Template: {
            description: 'a text template',
            doc: WRITE_DOC,
            start: 'evaluate each expression in the template',
            finish: 'constructing text from the values',
        },
        TextLiteral: {
            description: 'some text',
            doc: WRITE_DOC,
            start: 'create a text value',
        },
        This: {
            description: 'get the structure evaluting this',
            doc: WRITE_DOC,
            start: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        UnaryOperation: {
            description: 'evaluate function ',
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate the ', value),
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        UnparsableExpression: {
            description: 'unparsable',
            doc: `a list of unparsable @Token`,
            start: 'cannot evaluate unparsable code',
        },
        Update: {
            description: 'update',
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with revised rows, ',
                    value ?? 'nothing'
                ),
        },
        AnyType: {
            description: 'anything',
            doc: `represents any possible type`,
        },
        BooleanType: {
            description: 'boolean',
            doc: `a true or false value`,
        },
        ConversionType: {
            description: 'conversion',
            doc: `a type of function that converts values of one type to another `,
        },
        ExceptionType: {
            description: 'exception',
            doc: WRITE_DOC,
        },
        FunctionDefinitionType: {
            description: 'function',
            doc: WRITE_DOC,
        },
        FunctionType: {
            description: 'function',
            doc: WRITE_DOC,
        },
        ListType: {
            description: (
                node: ListType,
                translation: Translation,
                context: Context
            ) =>
                node.type === undefined
                    ? 'list'
                    : `list of ${node.type.getDescription(
                          translation,
                          context
                      )}`,
            doc: WRITE_DOC,
        },
        MapType: {
            description: (
                node: MapType,
                translation: Translation,
                context: Context
            ) =>
                node.key === undefined || node.value === undefined
                    ? 'map'
                    : `map of ${node.key.getDescription(
                          translation,
                          context
                      )} to ${node.value.getDescription(translation, context)}`,
            doc: WRITE_DOC,
        },
        MeasurementType: {
            description: () => 'number',
            doc: WRITE_DOC,
        },
        NameType: {
            description: (node: NameType) => `${node.name.getText()}`,
            doc: WRITE_DOC,
        },
        NeverType: {
            description: 'impossible type',
            doc: WRITE_DOC,
        },
        NoneType: {
            description: 'nothing',
            doc: WRITE_DOC,
        },
        SetType: {
            description: (
                node: SetType,
                translation: Translation,
                context: Context
            ) =>
                node.key === undefined
                    ? 'set type'
                    : `set of type ${node.key.getDescription(
                          translation,
                          context
                      )}`,
            doc: WRITE_DOC,
        },
        StreamDefinitionType: {
            description: (
                node: StreamDefinitionType,
                translation: Translation
            ) =>
                `a ${node.definition.names.getTranslation(
                    translation.language
                )} stream`,
            doc: WRITE_DOC,
        },
        StreamType: {
            description: (
                node: StreamType,
                translation: Translation,
                context: Context
            ) =>
                `a type of stream of ${node.type.getDescription(
                    translation,
                    context
                )}`,
            doc: WRITE_DOC,
        },
        StructureDefinitionType: {
            description: 'structure',
            doc: WRITE_DOC,
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
            doc: WRITE_DOC,
        },
        TableType: {
            description: 'table',
            doc: WRITE_DOC,
        },
        TextType: {
            description: 'text',
            doc: WRITE_DOC,
        },
        TypePlaceholder: {
            description: 'placeholder type',
            doc: WRITE_DOC,
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
            doc: WRITE_DOC,
        },
        Unit: {
            description: (node, translation, context) =>
                node.exponents.size === 0
                    ? 'number'
                    : node.numerator.length === 1 &&
                      node.denominator.length === 0
                    ? node.numerator[0].getDescription(translation, context)
                    : node.toWordplay() === 'm/s'
                    ? 'velocity'
                    : 'number with unit',
            doc: WRITE_DOC,
        },
        UnparsableType: {
            description: 'unparsable type',
            doc: WRITE_DOC,
        },
        VariableType: {
            description: 'variable type',
            doc: WRITE_DOC,
        },
        CycleType: {
            description: (node: CycleType) =>
                `${node.expression.toWordplay()} depends on itself`,
            doc: WRITE_DOC,
        },
        UnknownVariableType: {
            description: "this type variable couldn't be inferred",
            doc: WRITE_DOC,
        },
        NotAListType: {
            description: 'not a list',
            doc: WRITE_DOC,
        },
        NoExpressionType: {
            description: 'there was no expression given',
            doc: WRITE_DOC,
        },
        NotAFunctionType: {
            description: 'not a function',
            doc: WRITE_DOC,
        },
        NotATableType: {
            description: 'not a table',
            doc: WRITE_DOC,
        },
        NotAStreamType: {
            description: 'not a stream',
            doc: WRITE_DOC,
        },
        NotASetOrMapType: {
            description: 'not a set or map',
            doc: WRITE_DOC,
        },
        NotEnclosedType: {
            description: 'not in a structure, conversion, or reaction',
            doc: WRITE_DOC,
        },
        NotImplementedType: {
            description: 'not implemented',
            doc: WRITE_DOC,
        },
        UnknownNameType: {
            description: (node: UnknownNameType) =>
                node.name === undefined
                    ? "a name wasn't given"
                    : `${node.name.getText()} isn't defined`,
            doc: WRITE_DOC,
        },
    },
    native: {
        bool: {
            doc: `We are single true or false value.
            
            We are the simplest value type, since we can only be one of two values, (⊤) and (⊥).`,
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
            doc: `I am nothing
            
            I am special because I am only equal to me.
            I can only ever be me and only ever want to be me!`,
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
            doc: `We are any words imaginable.
            
            We can represent ideas, stories, words, and more, and even represent other types of values, but as text.`,
            name: 'text',
            function: {
                length: {
                    doc: WRITE_DOC,
                    name: ['📏', 'length'],
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
            doc: `We are any number imaginable, even with units.
            
            We can be integers, real numbers, negative, positive, fractional, decimal. We can be Arabic numers (123), Roman numerals (ⅩⅩⅩⅠⅩ), Japanese numerals (二十), and more.`,
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
            doc: `We group values in sequence.
            
            Keeping this in order is our mission; but we can only do that if we stay together ([]).`,
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
                    name: ['📏', 'length'],
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
            doc: `We group unique values in no particular order.
            
            We don't like it when there's more than one value of a particular kind! Everything must be unique.`,
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
            doc: `We map one set of values to another set of values.
            
            Everything inside us must be connected, but to only one thing.`,
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
            Explanation.as(
                'no function named ',
                node,
                ' in ',
                type === undefined ? ' scope' : type
            ),
        name: (node, scope) =>
            Explanation.as(
                'nothing named ',
                node,
                ' in ',
                scope === undefined ? ' scope' : scope
            ),
        cycle: (node) => Explanation.as(node, ' depends on itself'),
        functionlimit: (fun) =>
            Explanation.as('evaluated too many functions, especially ', fun),
        steplimit: 'evaluated too many steps in this function',
        type: (expected, given) =>
            Explanation.as('expected ', expected, ' but received ', given),
        placeholder: (node) =>
            Explanation.as('this ', node, ' is not implemented'),
        unparsable: (node) => Explanation.as('this ', node, ' is not parsable'),
        value: (node) =>
            Explanation.as(node, ' expected a value, but did not receive one'),
    },
    conflict: {
        BorrowCycle: {
            primary: (borrow) =>
                Explanation.as(
                    'this depends on ',
                    borrow,
                    " which depends on this source, so the program can't be evaluated"
                ),
        },
        ReferenceCycle: {
            primary: (ref) =>
                Explanation.as(
                    ref,
                    ' depends on itself, so it cannot be evaluated'
                ),
        },
        DisallowedInputs: {
            primary:
                'inputs on interfaces not allowed because one or more of its functions are unimplemented',
        },
        DuplicateName: {
            primary: (name) =>
                Explanation.as(
                    name,
                    ' is already defined, which might intend to refer to the other bind with the same name'
                ),
            secondary: (name) =>
                Explanation.as('this is overwritten by ', name),
        },
        DuplicateShare: {
            primary: (bind) =>
                Explanation.as(
                    'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
            secondary: (bind) =>
                Explanation.as(
                    'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
        },
        DuplicateTypeVariable: {
            primary: (dupe) =>
                Explanation.as('this has the same name as ', dupe),
            secondary: (dupe) =>
                Explanation.as('this has the same name as ', dupe),
        },
        ExpectedBooleanCondition: {
            primary: (type: NodeLink) =>
                Explanation.as(
                    'expected boolean condition but received ',
                    type
                ),
        },
        ExpectedColumnType: {
            primary: (bind) =>
                Explanation.as(
                    'this table column ',
                    bind,
                    ' has no type, but all columns require one'
                ),
        },
        ExpectedEndingExpression: {
            primary:
                'blocks require at least one expression so that they evaluate to something',
        },
        ExpectedSelectName: {
            primary: (cell) =>
                Explanation.as(
                    cell,
                    ' has no name; selects require column names to know what columns to return'
                ),
        },
        ExpectedUpdateBind: {
            primary: (cell) =>
                Explanation.as(
                    cell,
                    ' has value; updates require a value for each column specified to know what value to set'
                ),
        },
        IgnoredExpression: {
            primary:
                'this expression is not used; it will not affect the value of anything',
        },
        IncompleteImplementation: {
            primary: `structures must either be fully implemented or not implemented; this has a mixture`,
        },
        IncompatibleBind: {
            primary: (expected) => Explanation.as('expected ', expected),
            secondary: (given) => Explanation.as('given ', given),
        },
        IncompatibleCellType: {
            primary: (expected) =>
                Explanation.as('expected column type ', expected),
            secondary: (given) => Explanation.as('given ', given),
        },
        IncompatibleInput: {
            primary: (expected) =>
                Explanation.as('expected ', expected, ' input'),
            secondary: (given) => Explanation.as('given ', given),
        },
        IncompatibleKey: {
            primary: (expected) =>
                Explanation.as('expected ', expected, ' key '),
            secondary: (given) => Explanation.as('given ', given),
        },
        ImpossibleType: {
            primary: 'this can never be this type',
        },
        InvalidLanguage: {
            primary: `this is not a valid language code`,
        },
        InvalidRow: {
            primary: `row is missing one or more required columns`,
        },
        InvalidTypeInput: {
            primary: (def) =>
                Explanation.as(def, ` does not expect this type input`),
            secondary: (type) =>
                Explanation.as('this definition does expect type ', type),
        },
        MisplacedConversion: {
            primary: `conversions only allowed in structure definitions`,
        },
        MisplacedInput: {
            primary: `this input is out of the expected order`,
        },
        MisplacedShare: {
            primary: `shares only allowed at top level of program`,
        },
        MisplacedThis: {
            primary: `${PROPERTY_SYMBOL} only allowed in structure definition, conversion definition, or reaction`,
        },
        MissingCell: {
            primary: (column) =>
                Explanation.as(`this row is missing column`, column),
            secondary: (row) =>
                Explanation.as(
                    `this column is required, but `,
                    row,
                    ' did not provide it'
                ),
        },
        MissingInput: {
            primary: (input) =>
                Explanation.as(
                    'expected input ',
                    input,
                    ' but did not receive it'
                ),
            secondary: (evaluate) =>
                Explanation.as(
                    `this input is required, but `,
                    evaluate,
                    ' did not provide it'
                ),
        },
        MissingLanguage: {
            primary:
                'no language was provided, but there was a slash suggesting one would be',
        },
        MissingShareLanguages: {
            primary:
                'shared bindings must specify language so others know what languages are supported',
        },
        NoExpression: {
            primary: `functions require an expression, but none was provided for this one`,
        },
        NonBooleanQuery: {
            primary: (type) =>
                Explanation.as('queries must be boolean, but this is a ', type),
        },
        NotAFunction: {
            primary: (name, type) =>
                Explanation.as(
                    name ? name : 'this',
                    ' is not a function ',
                    type ? ' in ' : ' in scope',
                    type ? type : ''
                ),
        },
        NotAList: {
            primary: (type) =>
                Explanation.as('expected a list, this is a ', type),
        },
        NotAListIndex: {
            primary: (type) =>
                Explanation.as('expected number, this is a ', type),
        },
        NotAMap: {
            primary:
                'this expression is not allowed in a map, only key/value pairs are allowed',
            secondary: (expr) => Explanation.as('this map has a ', expr),
        },
        NotANumber: {
            primary: "this number isn't formatted correctly",
        },
        NotAnInterface: {
            primary:
                'this is not an interface; structures can only implement interfaces, not other structures',
        },
        NotASetOrMap: {
            primary: (type) =>
                Explanation.as('expected set or map, but this is a ', type),
        },
        NotAStream: {
            primary: (type) =>
                Explanation.as('expected stream, but this is a ', type),
        },
        NotAStreamIndex: {
            primary: (type) =>
                Explanation.as('expected a number, but this is a ', type),
        },
        NotATable: {
            primary: (type) =>
                Explanation.as('expected a table, but this is a ', type),
        },
        NotInstantiable: {
            primary:
                'cannot make this structure because it refers to an interface',
        },
        OrderOfOperations: {
            primary:
                'operators evalute left to right, unlike math; use parentheses to specify order of evaluation',
        },
        Placeholder: {
            primary:
                'this is unimplemented, so the program will stop if evaluated',
        },
        RequiredAfterOptional: {
            primary: 'required inputs cannot come after optional ones',
        },
        UnclosedDelimiter: {
            primary: (token, expected) =>
                Explanation.as('expected ', expected, ' to match ', token),
        },
        UnexpectedEtc: {
            primary:
                'variable length inputs can only appear on function evaluations',
        },
        UnexpectedInput: {
            primary: (evaluation) =>
                Explanation.as('this input is not specified on ', evaluation),
            secondary: (input) =>
                Explanation.as('this function does not expect this ', input),
        },
        UnexpectedTypeVariable: {
            primary: 'type inputs not allowed on type variables',
        },
        UnimplementedInterface: {
            primary: (inter, fun) =>
                Explanation.as(
                    'this structure implements ',
                    inter,
                    ' but does not implement ',
                    fun
                ),
        },
        UnknownBorrow: {
            primary: 'unknown source and name',
        },
        UnknownColumn: {
            primary: 'unknown column in table',
        },
        UnknownConversion: {
            primary: (from, to) =>
                Explanation.as('no conversion from ', from, ' to ', to),
        },
        UnknownInput: {
            primary: 'no input by this name',
        },
        UnknownName: {
            primary: (name, type) =>
                Explanation.as(
                    name,
                    ' is not defined in ',
                    type ? type : ' this scope'
                ),
        },
        InvalidTypeName: {
            primary: (type) =>
                Explanation.as(
                    'type names can only refer to structures or type variables, but this refers to a ',
                    type
                ),
        },
        Unnamed: {
            primary: 'missing name',
        },
        UnparsableConflict: {
            primary: (expression) =>
                expression
                    ? 'expected expression, but could not parse one'
                    : 'expected type, but could not parse one',
        },
        UnusedBind: {
            primary: 'this name is unused',
        },
        InputListMustBeLast: {
            primary: 'list of inputs must be last',
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
            back: 'back one step',
            backInput: 'back one input',
            out: 'step out of this function',
            forward: 'forward one step',
            forwardInput: 'forward one input',
            present: 'to the present',
            start: 'to the beginning',
            reset: 'restart the evaluation of the project from the beginning.',
            home: 'return to the types menu',
            revert: 'revert to default',
            set: 'edit this property',
            fullscreen: 'fill the browser with this window',
            collapse: 'collapse window',
            expand: 'expand window',
            close: 'close this project',
            language: 'change preferred languages',
            horizontal: 'switch to horizontal arrangement',
            vertical: 'switch to vertical arrangement',
            freeform: 'switch to free form arrangement',
            addPhrase: 'add a phrase to the verse',
            fit: 'fit to content',
            grid: 'show/hide grid',
        },
        labels: {
            learn: 'learn more …',
            nodoc: 'no documentation',
            mixed: 'mixed',
            computed: 'computed',
            default: 'default',
            inherited: 'inherited',
        },
        tiles: {
            output: '💬',
            docs: '📕',
            palette: '🎨',
        },
        headers: {
            editing: 'editing',
        },
    },
    input: {
        random: {
            doc: WRITE_DOC,
            name: ['🎲', 'random'],
            min: { name: 'min', doc: WRITE_DOC },
            max: { name: 'max', doc: WRITE_DOC },
        },
        mousebutton: {
            doc: WRITE_DOC,
            name: ['🖱️', 'mousebutton'],
            down: { name: 'down', doc: WRITE_DOC },
        },
        mouseposition: {
            doc: WRITE_DOC,
            name: ['👆🏻', 'mouseposition'],
        },
        keyboard: {
            doc: WRITE_DOC,
            name: ['⌨️', 'keyboard'],
            key: { name: 'key', doc: WRITE_DOC },
            down: { name: 'down', doc: WRITE_DOC },
        },
        time: {
            doc: WRITE_DOC,
            name: ['🕕', 'time'],
            frequency: {
                name: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        microphone: {
            doc: WRITE_DOC,
            name: ['🎤', 'microphone'],
            frequency: {
                name: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        reaction: {
            doc: WRITE_DOC,
            name: 'reaction',
        },
        motion: {
            doc: WRITE_DOC,
            name: ['⚽️', 'Motion'],
            type: {
                doc: WRITE_DOC,
                name: 'type',
            },
            vx: {
                doc: WRITE_DOC,
                name: 'vx',
            },
            vy: {
                doc: WRITE_DOC,
                name: 'vy',
            },
            vz: {
                doc: WRITE_DOC,
                name: 'vz',
            },
            vangle: {
                doc: WRITE_DOC,
                name: 'vangle',
            },
            mass: {
                doc: WRITE_DOC,
                name: 'mass',
            },
            bounciness: {
                doc: WRITE_DOC,
                name: 'bounciness',
            },
            gravity: {
                doc: WRITE_DOC,
                name: 'gravity',
            },
        },
    },
    output: {
        type: {
            definition: { doc: WRITE_DOC, name: 'Type' },
            size: { doc: WRITE_DOC, name: 'size' },
            family: { doc: WRITE_DOC, name: 'font' },
            place: { doc: WRITE_DOC, name: 'place' },
            name: { doc: WRITE_DOC, name: 'name' },
            enter: { doc: WRITE_DOC, name: 'enter' },
            rest: { doc: WRITE_DOC, name: 'rest' },
            move: { doc: WRITE_DOC, name: 'move' },
            exit: { doc: WRITE_DOC, name: 'exit' },
            duration: { doc: WRITE_DOC, name: ['⏳', 'duration'] },
            style: { doc: WRITE_DOC, name: 'style' },
        },
        group: {
            definition: { doc: WRITE_DOC, name: ['🔳', 'Group'] },
            content: { doc: WRITE_DOC, name: 'content' },
            arrangement: { doc: WRITE_DOC, name: 'layout' },
        },
        phrase: {
            definition: { doc: WRITE_DOC, name: ['💬', 'Phrase'] },
            text: { doc: WRITE_DOC, name: 'text' },
        },
        arrangement: {
            definition: { doc: WRITE_DOC, name: ['⠿', 'Arrangement'] },
        },
        pose: {
            definition: { doc: WRITE_DOC, name: ['🤪', 'Pose'] },
            duration: { doc: WRITE_DOC, name: 'duration' },
            style: { doc: WRITE_DOC, name: 'style' },
            color: { doc: WRITE_DOC, name: 'color' },
            opacity: { doc: WRITE_DOC, name: 'opacity' },
            offset: { doc: WRITE_DOC, name: 'offset' },
            scale: { doc: WRITE_DOC, name: 'scale' },
            flipx: { doc: WRITE_DOC, name: 'flipx' },
            flipy: { doc: WRITE_DOC, name: 'flipy' },
        },
        color: {
            definition: { doc: WRITE_DOC, name: ['🌈', 'Color'] },
            lightness: { doc: WRITE_DOC, name: ['lightness', 'l'] },
            chroma: { doc: WRITE_DOC, name: ['chroma', 'c'] },
            hue: { doc: WRITE_DOC, name: ['hue', 'h'] },
        },
        sequence: {
            definition: { doc: WRITE_DOC, name: ['┅', 'Sequence'] },
            count: { doc: WRITE_DOC, name: 'count' },
            timing: { doc: WRITE_DOC, name: 'timing' },
            poses: { doc: WRITE_DOC, name: 'poses' },
        },
        place: {
            definition: { doc: WRITE_DOC, name: ['📍', 'Place'] },
            x: { doc: WRITE_DOC, name: 'x' },
            y: { doc: WRITE_DOC, name: 'y' },
            z: { doc: WRITE_DOC, name: 'z' },
            rotation: { doc: WRITE_DOC, name: 'rotation' },
        },
        row: {
            definition: { doc: WRITE_DOC, name: ['➡', 'Row'] },
            description: WRITE_DOC,
            padding: { doc: WRITE_DOC, name: 'padding' },
        },
        stack: {
            definition: { doc: WRITE_DOC, name: ['⬇', 'Stack'] },
            description: WRITE_DOC,
            padding: { doc: WRITE_DOC, name: 'padding' },
        },
        verse: {
            definition: { doc: WRITE_DOC, name: ['🌎', '🌍', '🌏', 'Verse'] },
            description: WRITE_DOC,
            content: { doc: WRITE_DOC, name: 'content' },
            background: { doc: WRITE_DOC, name: 'background' },
            focus: { doc: WRITE_DOC, name: 'focus' },
        },
        easing: {
            straight: 'straight',
            cautious: 'cautious',
            pokey: 'pokey',
            zippy: 'zippy',
        },
    },
};

export default en;
