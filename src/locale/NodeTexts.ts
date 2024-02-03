import type { DocText, Template } from './Locale';
import type Emotion from '../lore/Emotion';

export type NodeText = {
    /** The name that should be used to refer to the node type */
    name: string;
    /** Documentation text that appears in the documentation view */
    doc: DocText;
    /** The emotion that should be conveyed in animations of the node type */
    emotion: `${Emotion}`;
};

export type DescriptiveNodeText = NodeText & {
    /** A precise description of the node's contents, more specific than a name. If not provided, name is used. */
    description: Template;
};

export interface SimpleExpressionText {
    /** The text shown when this expression type first begins evaluating.  */
    start: Template;
}

export interface ExpressionText extends SimpleExpressionText {
    /** The text shown when this expression type finishes evaluating and has a value. */
    finish: Template;
}

export interface Conflicts<T> {
    /** Conflicts that this node can generate */
    conflict: T;
}

/** The text that describes this confilct type. */
export type InternalConflictText = Template;

export type ConflictText = {
    /** The text that describes this conflict on the node which generated it. */
    primary: Template;
    /** The text that describes this conflict on a related note, but not the one that generated it. */
    secondary: Template;
};

export interface Exceptions<Kinds> {
    /** The set of exception values that this node can evaluate to. */
    exception: Kinds;
}

export interface ExceptionText {
    /** A description of the kind of exception this is; appears as screen reader text and a header when exception value is displayed on stage. */
    description: Template;
    /** The text of the explanation, in the voice of the node that generated it. Appears when value is shown on stage. */
    explanation: Template;
}

type NodeTexts = {
    /** A part of a number's unit, such as the `m` in `1m`, or the `s` in `1m/s^2` */
    Dimension: DescriptiveNodeText;
    /** A single language tagged documentation text, ` ``I am documentation``/en` */
    Doc: NodeText;
    /** Multiple language tagged documentation texts, ` ``Hi docs``/en``Hola docs``/es`  */
    Docs: NodeText & SimpleExpressionText;
    /** A key value pair in a map, such as `a: 1` in `{ a: 1 b: 2}`  */
    KeyValue: NodeText;
    /** A language tag appearing in a doc or name, such as `/en` in `name/en: 1` or ` ``My doc``/en` */
    Language: DescriptiveNodeText &
        Conflicts<{
            UnknownLanguage: InternalConflictText;
            MissingLanguage: InternalConflictText;
        }>;
    /**
     * A name, e.g., `hi`.
     * Description inputs: $1 = name or undefined
     */
    Name: DescriptiveNodeText;
    /** A list of names, e.g., `hi,hello,hey` */
    Names: NodeText;
    /** A row in a table, e.g., `⎡1 2⎦` */
    Row: NodeText &
        Conflicts<{
            /** When a row does not form to it's table's type definition */
            InvalidRow: InternalConflictText;
            /**
             * When cell is missing from a row. $1: Column
             * $2: Row
             * */
            MissingCell: ConflictText;
            /**
             * When an extra cell was provided.
             * $1: Cell */
            ExtraCell: ConflictText;
            /**
             * When a unknown column is specified by name.
             */
            UnknownColumn: InternalConflictText;
            /** When a bind was not expected in a row but it was provided. */
            UnexpectedColumnBind: ConflictText;
        }>;
    /**
     * Any token in a Wordplay program.
     * Description inputs: $1 = token label, $2 = token text
     */
    Token: DescriptiveNodeText;
    /** A list of type inputs to something that takes type variables, e.g., `⸨# #⸩` in `myfun⸨# #⸩(b c)` */
    TypeInputs: NodeText;
    /** A type variable in function or structure definition, `T` in `ƒ⸨T⸩(a: T)` */
    TypeVariable: NodeText &
        Conflicts<{
            /** When a type variable name is the same as another. $1: The duplicate name */
            DuplicateTypeVariable: ConflictText;
        }>;
    /** A list of type variables in a function or structure definition, e.g. `⸨T⸩` in `ƒ⸨T⸩(a: T b: T)` */
    TypeVariables: NodeText;
    /**
     * Markup text used in documentation or phrase text, e.g., ` ``Hello, I am *bold*`` `
     * Description inputs: $1 = paragraph count
     */
    Markup: DescriptiveNodeText;
    /**
     * A paragraph of text in `Markup`, e.g.,  `Paragraph 1` in ` ``Paragraph 1\n\nParagraph 2`` `
     * Description inputs: $1 = number, $2 = unit
     */
    Paragraph: NodeText;
    /**
     * A link in `Markup`, e.g., ` ``<wordplay@https://wordplay.div>`` `
     * Description inputs: $1 = the url
     */
    WebLink: DescriptiveNodeText;
    /**
     * A link to a Wordplay concept in `Markup`, e.g., ` ``Check out @WebLink`` `
     * Description inputs: $1: the concept name
     */
    ConceptLink: DescriptiveNodeText;
    /** A sequence of glyphs in `Markup` that aren't other markup content, e.g., ` ``These are just words.`` ` */
    Words: NodeText;
    /** Code inside `Markup`, e.g., ` ``This is how you add: \1 + 1\`` ` */
    Example: NodeText;
    /**
     * A placeholder for some template input or terminology name in a localization string, e.g., the `$1` in  ` ``My value is $1`` or `$bind` in ` ``I am a $bind`` `
     * Description inputs: $1 = the name or number mentioned
     */
    Mention: DescriptiveNodeText;
    /**
     * A branch in `Markup` that renders different text depending on an input, e.g., ` ``$1[I am $1|I am nothing]`` `
     */
    Branch: NodeText;
    /**
     * An infix formatted binary operation, e.g., `1 + 1` or `2 ÷ 3`
     * Description inputs: $1 = the operator
     * Start inputs: $1 = left expression
     * Finish inputs: $1 = resulting value
     */
    BinaryEvaluate: DescriptiveNodeText &
        ExpressionText & {
            /** How to describe the right operand in a placeholder expression */
            right: Template;
        } & Conflicts<{
            /** Warning about order of evaluation of binary evaluations always being reading order, not math order of operations */
            OrderOfOperations: InternalConflictText;
        }>;
    /**
     * Naming a value, e.g., `mybinding: 5m`
     * Description inputs: $1 = the name that is bound
     * Start inputs: $1 = the bind name being evaluated
     * Finish inputs: $1 = the value producd, $2: the names bound
     */
    Bind: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /** When a bind has duplicate names. Description inputs: $1: The name that shadowed this one */
            DuplicateName: ConflictText;
            /** When a shared bind has a duplicate name that's shared. Description inputs: $1: The duplicate */
            DuplicateShare: ConflictText;
            /**
             * When a bind and it's value type are incompatible.
             * Description inputs: $1: Expected type, $2: Given type
             **/
            IncompatibleType: ConflictText;
            /**
             * When a bind is marked as share, but not at the top level.
             */
            MisplacedShare: InternalConflictText;
            /** When a bind is shared, but not language tagged. */
            MissingShareLanguages: InternalConflictText;
            /** When a bind is required, but appears after an optional bind in a definition */
            RequiredAfterOptional: InternalConflictText;
            /** When a bind is marked as a variable length list, but not at the end. */
            UnexpectedEtc: InternalConflictText;
            /** When a bind is declared but never used. */
            UnusedBind: InternalConflictText;
        }>;
    /**
     * A block of expressions, evaluating to the final expression's value, e.g., `(a: 1  1 + a)`
     * Description inputs: $1: # of statements
     * Start inputs: none
     * Finish inputs: $1 = Resulting value
     */
    Block: DescriptiveNodeText &
        ExpressionText & {
            /** The placeholder label for a statement in the block */
            statement: Template;
        } & Conflicts<{
            /** When there's no ending expression */
            ExpectedEndingExpression: InternalConflictText;
            /** When a statement is ignored because it's not last and not a bind */
            IgnoredExpression: ConflictText;
        }>;
    /**
     * A single boolean literal, e.g., `⊤` or `⊥`
     * Description inputs: $1: true if true, false otherwise
     */
    BooleanLiteral: DescriptiveNodeText & SimpleExpressionText;
    /**
     * A borrow staement, indicating some code to import into a source
     * Start inputs: $1 = source name, $2: name borrowed
     */
    Borrow: DescriptiveNodeText &
        SimpleExpressionText & {
            /** Placeholder label for the source name */
            source: Template;
            /** Placeholder label for the bind name being borrowed */
            bind: Template;
            /** Placeholder label for the version being borrowed */
            version: Template;
        } & Conflicts<{
            /** When the borrowed name could not be found */
            UnknownBorrow: InternalConflictText;
            /** When a borrowed value depends on the source file doing the borrowing. Description inputs: $1 = borrow that had a cycle */
            BorrowCycle: InternalConflictText;
        }> &
        Exceptions<{
            /** When a borrow depends on itself. Description inputs: $1: Borrow that it depends on */
            CycleException: ExceptionText;
        }>;

    /**
     * A change predicate expression, true if the stream changed, causing this reevaluation, e.g., `∆ Key()`
     * Start inputs: $1 = stream that changed
     */
    Changed: NodeText & SimpleExpressionText;
    /**
     * A conditional expression, e.g., `truth ? 'yes' 'no'`
     * Start inputs: $1 = description of condition to check
     * Finish inputs: $1 = resulting value
     */
    Conditional: NodeText &
        ExpressionText & {
            /** When the else case is chosen. Description inputs: $1: true if jumping to the "else" expression */
            afterthen: Template;
            /** After the then case is done. Description inputs: jump after the "then" expression */
            else: Template;
            /** A placeholder label for the condition */
            condition: Template;
            /** A placeholder label for then expression */
            yes: Template;
            /** A placeholder label for else condition */
            no: Template;
        } & Conflicts<{
            /**
             * When the condition is not boolean typed, e.g., `1 ? 'yes' 'no'`
             * Description inputs: $1 = The non-boolean expression
             */
            ExpectedBooleanCondition: ConflictText;
        }>;
    Otherwise: NodeText & ExpressionText;
    /** A definition of a conversion, e.g. `→ # #m 5` */
    ConversionDefinition: DescriptiveNodeText &
        SimpleExpressionText &
        Conflicts<{
            /** When a conversion is defined somewhere it's not allowed. */
            MisplacedConversion: InternalConflictText;
        }>;
    /**
     * A conversion expression, e.g., `1 → ''`
     * Start inputs: $1 = expression to convert
     * Finish inputs: $1 = resulting value
     */
    Convert: NodeText &
        ExpressionText &
        Conflicts<{
            /**
             * When conversion could not be found.
             * Description inputs: $1 = from type, $2: to type
             **/
            UnknownConversion: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * When a conversion could not be found during evaluation.
             * Description inputs: $1 = from type, $2: to type$1: From type
             */
            ConversionException: ExceptionText;
        }>;
    /**
     * A row delete expression, e.g., `table ⎡- 1 < 2`
     * Start inputs: $1 = table expression
     * Finish inputs: $1 = resulting value
     */
    Delete: NodeText & ExpressionText;
    /** A expression with a doc, e.g., ` ``my doc``1 + 1 `` */
    DocumentedExpression: NodeText & SimpleExpressionText;
    /**
     * An evaluation of a function with inputs, e.g., `myfun(1 2 3)`
     * Description inputs: $1 = name of function being evaluated
     * Start inputs: none
     * Finish inputs: $1 = resulting value
     */
    Evaluate: DescriptiveNodeText &
        ExpressionText & {
            /** What to say after inputs are done evaluating, right before starting evaluation the function */
            evaluate: Template;
            /** Placeholder label for the function */
            function: Template;
            /** Placeholder labelf or an unspecified input */
            input: Template;
        } & Conflicts<{
            /**
             * When an input given to this evaluate doesn't match the input of the function being evaluated
             * Description inputs: $1 = expected type, $2 = given type
             * */
            IncompatibleInput: ConflictText;
            /**
             * When a type input given is not expected.
             * Description inputs: $1 = definition given, $2: type given
             * */
            UnexpectedTypeInput: ConflictText;
            /**
             * When an input is given, but in the wrong order.
             */
            MisplacedInput: InternalConflictText;
            /**
             * When an input is expected, but not given.
             * Description inputs: $1 = missing input, $2: evaluate that is missing input
             * */
            MissingInput: ConflictText;
            /**
             * When the structure definition given is an interface, and can't be created
             */
            NotInstantiable: InternalConflictText;
            /**
             * When an input value is given but not expected
             * Description inputs: $1 = evaluate with unexected input, $2: unexpected input
             * */
            UnexpectedInput: ConflictText;
            /**
             * When an named input value is given but not a known input name
             */
            UnknownInput: ConflictText;
            /**
             * When a list of inputs is given but isn't last.
             */
            InputListMustBeLast: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * When the function being evaluated is not a function.
             * Description inputs: $1 = Expression that didn't produce a function, $2: scope not found in, or undefined
             */
            FunctionException: ExceptionText;
        }>;
    /**
     * An expression placeholder, e.g., `1 + _`
     * Description inputs: $1: type or undefined
     */
    ExpressionPlaceholder: DescriptiveNodeText &
        SimpleExpressionText & {
            placeholder: Template;
        } & Conflicts<{ Placeholder: InternalConflictText }> &
        Exceptions<{
            /** No inputs */
            UnimplementedException: ExceptionText;
        }>;
    /**
     * A function, e.g., `ƒ add(a•# b•#) a + b`
     * Description inputs: $1: function name in locale
     */
    FunctionDefinition: DescriptiveNodeText &
        SimpleExpressionText &
        Conflicts<{
            /** When a function has no expression */
            NoExpression: InternalConflictText;
        }>;
    /**
     * An internal node used by higher order functions to iterate over a list of values.
     * Finish inputs: $1 = resulting value
     */
    Iteration: NodeText &
        ExpressionText & {
            /** What to say when the iteration initialization begins */
            initialize: Template;
            /** What to say when the next value is being gotten */
            next: Template;
            /** What to say when the next value is being checked to decide whether to continue */
            check: Template;
        };
    /**
     * Inserting a table row, e.g., `table ⎡+ 1⎦`
     * Start inputs: $1 = table expression
     * Finish inputs: $1: resulting value
     */
    Insert: NodeText & ExpressionText;
    /**
     * Whether the evaluation happening is the first one, e.g., `◆` in `◆ ? 'first' 'later'`
     */
    Initial: NodeText;
    /**
     * A predict to check if a value's type matches, e.g., `1•#`
     * Description inputs: $1 = The type being checked for
     * Start inputs: $1 = expression
     * Finish inputs: $1 = resulting value, $2 = type of value
     */
    Is: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /** When the type given isn't possible */
            ImpossibleType: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * When a type expected is not the type that was received.
             * Description input: $1 = expected type, $2 = received type
             */
            TypeException: ExceptionText;
        }>;
    /**
     * Check if the current locale is a particular langauge, e.g., `🌏/en`
     */
    IsLocale: DescriptiveNodeText & SimpleExpressionText;
    /**
     * Getting the value of a list at a particular index, e.g., `list[5]`
     * Start inputs: $1 = list value
     * Finish inputs: $1: resulting value
     */
    ListAccess: NodeText & ExpressionText;
    /**
     * A list, e.g., `[1 2 3]`
     * Description inputs: $1 = item count
     * Finish inputs: $1 = resulting value
     */
    ListLiteral: DescriptiveNodeText &
        ExpressionText & {
            /** Placeholder label for an item in a list */
            item: Template;
        };
    /**
     * A way of spreading a list's values into a list literal, e.g., `[ [ 1 2 3]… 4 5]`
     * Description inputs: none
     */
    Spread: NodeText;
    /**
     * A map literal, e.g., `{1:1 2:2 3:3}`
     * Finish inputs: $1 = resulting value
     */
    MapLiteral: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /**
             * When something other than a key value pair is given.
             * Description inputs: $1 = expression that's not a map
             * */
            NotAKeyValue: ConflictText;
        }>;
    /** A number literal, e.g., `1` */
    NumberLiteral: DescriptiveNodeText &
        SimpleExpressionText &
        Conflicts<{
            /** When something is not a valid number format */
            NotANumber: InternalConflictText;
        }>;
    /** An internal expression, used to implement core APIs. */
    InternalExpression: NodeText & SimpleExpressionText;
    /** A none literal, e.g., `ø` */
    NoneLiteral: NodeText & SimpleExpressionText;
    /**
     * A previous value of a stream, `← 1 Key()` or `←← 10 Key()`
     * Start inputs: $1 = the stream expression being checked
     * Finish inputs: $1 = resulting value
     */
    Previous: NodeText & ExpressionText;
    /**
     * A program, e.g., `1 + 1`, `hello()`, etc.
     * Start inputs: $1 = the stream that caused the evaluation, or nothing
     * Finish inputs: $1 = resulting value
     */
    Program: NodeText &
        ExpressionText & {
            /** What to say when the program is halting because of a fatal error */
            halt: Template;
            /** What to say when the program is done evaluating */
            done: Template;
            /** What to say when the program has yet to evaluate */
            unevaluated: Template;
        } & Exceptions<{
            /** When a program is blank */
            BlankException: ExceptionText;
            /**
             * When the number of function evaluations have exceeded a limit
             * Description inputs: $1 = The function that was evaluated too many times */
            EvaluationLimitException: ExceptionText;
            /** When the number of steps have exceeded a limit */
            StepLimitException: ExceptionText;
            /** When a value was expected, but not provided */
            ValueException: ExceptionText;
        }>;
    /**
     * Revising a structure with a new value, e.g., `mammal.name: 5`
     * Description input: $1 = the name being refined
     * Finish inputs: $1: revised property, $2: revised value
     */
    PropertyBind: DescriptiveNodeText & ExpressionText;
    /**
     * Getting a structure property, e.g., `mammal.name`
     * Finish inputs: $1: property name, $2: value
     */
    PropertyReference: DescriptiveNodeText &
        ExpressionText & {
            property: Template;
        };
    /**
     * Generating a stream of values from other streams, e.g., `a: 1 … ∆ Time() … a + 1`
     * Finish inputs: $1 = resulting value
     */
    Reaction: NodeText &
        ExpressionText & {
            /** Placeholder label for the initial value */
            initial: Template;
            /** Placeholder label for the condition to check */
            condition: Template;
            /** Placeholder label for the next value */
            next: Template;
        } & Conflicts<{
            /** When the condition doesn't refer to a strema */
            ExpectedStream: InternalConflictText;
        }>;
    /**
     * A bind name, e.g., `a` in `1 + a`
     * Description inputs: $1 = the name
     * Start inputs: $1 = the name being resolved
     */
    Reference: DescriptiveNodeText &
        SimpleExpressionText & {
            /** The placeholder label for the name */
            name: Template;
        } & Conflicts</** $1: The name that depends on itself */
        {
            /**
             * When the name does not correspond to a bind in scope
             * Description inputs: $1 = Scope
             * */
            UnknownName: InternalConflictText;
            /** When a name refers to itself outside a reaction */
            ReferenceCycle: InternalConflictText;
            /** When a reference refers to a type variable */
            UnexpectedTypeVariable: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * When a name couldn't be found in bindings in scope
             * Description inputs: $1 = Scope in which name was not found */
            NameException: ExceptionText;
        }>;
    /**
     * A table select, e.g., `table ⎡? one⎦ 1 < 2`
     * Finish inputs: $1 = the table, $2: the result
     */
    Select: NodeText &
        ExpressionText &
        Conflicts<{
            /**
             * When a cell in the row isn't a name
             * Description inputs: $1: The select expression */
            ExpectedSelectName: InternalConflictText;
        }>;
    /**
     * A set, e.g., `{ 1 2 3 }`
     * Finish inputs: $1 = the new set!
     */
    SetLiteral: DescriptiveNodeText & ExpressionText;
    /**
     * A set or map access, e.g., `set{1}`
     * Finish inputs: $1 = the set/map value
     */
    SetOrMapAccess: NodeText &
        ExpressionText &
        Conflicts<{
            /**
             * A type of the key given doesn't match the type of the key in the set
             * Description inputs: $1: expected type, $2: given type
             */
            IncompatibleKey: ConflictText;
        }>;
    /**
     * A source file that contains a name and program.
     */
    Source: NodeText;
    /**
     * A stream definition.
     * Not typically written, since all streams are defined internally, but basically like a structure definition, e.g., `… Key()` */
    StreamDefinition: NodeText & SimpleExpressionText;
    /**
     * A structure type, e.g., `•Kitty(name•'')`
     * Description inputs: $1 = name of the structure
     */
    StructureDefinition: DescriptiveNodeText &
        SimpleExpressionText &
        Conflicts<{
            /** When inputs are declared on a structure with unimplemented functions */
            DisallowedInputs: InternalConflictText;
            /** When a structure implements some functions, but not all */
            IncompleteImplementation: InternalConflictText;
            /** When a structure implements something that isn't an interface */
            NotAnInterface: InternalConflictText;
            /**
             * When a structure implements an interface, but not all of its functions
             * Description inputs: $1 = Interface, $2 = Function
             */
            UnimplementedInterface: InternalConflictText;
        }>;
    /**
     * A table literal, e.g., `⎡a•# b•#⎦⎡1 2⎦`
     * Description inputs: $1 = the number of rows
     * Finish inputs: $1 = resulting table
     */
    TableLiteral: DescriptiveNodeText & ExpressionText;
    /**
     * A text literal, e.g., `'hi'`
     * Description inputs: $1 = the text of the text literal
     */
    TextLiteral: DescriptiveNodeText & SimpleExpressionText;
    /**
     * One alternate translation of a text literal, e.g., the `'hola/es`' of `'hi'/en'hola'/es`
     * Description inputs: $1 = the text
     */
    Translation: DescriptiveNodeText &
        Conflicts<{
            phone: InternalConflictText;
            email: InternalConflictText;
            address: InternalConflictText;
            tin: InternalConflictText;
            handle: InternalConflictText;
            /** How to describe the resolution of the sensitive information conflict. */
            resolution: Template;
            /** Note to remind users where they can manage sensitive information for their project. */
            reminder: Template;
        }>;
    /**
     * A formatted text literal, e.g., ` `hello *wordplay*` `
     * Description inputs: $1 = the text
     */
    FormattedLiteral: DescriptiveNodeText & SimpleExpressionText;
    /**
     * One alternate translation of a formatted text literal, e.g., ` `*hello*`/en`*hola*`/es` `
     * Description inputs: $1 = the text
     */
    FormattedTranslation: DescriptiveNodeText;
    /**
     * A reference to the containing value of a structure, conversion, or reaction, e.g., the `.` in `1 … ∆ Key() ? . + 1
     * Finish inputs: $1 = resulting value
     */
    This: NodeText &
        SimpleExpressionText &
        Conflicts<{ MisplacedThis: InternalConflictText }>;
    /**
     * A unary operation, e.g., `-1`
     * Description inputs: $1 = the operator
     * Finish inputs: $1 = resulting value
     */
    UnaryEvaluate: DescriptiveNodeText & ExpressionText;
    /**
     * An unparsable expression, e.g., `]a[` */
    UnparsableExpression: NodeText &
        SimpleExpressionText &
        Conflicts<{
            /**
             * When an unparsable expression or type is used.
             * Description inputs: $1: true if expression, false if type
             */
            UnparsableConflict: InternalConflictText;
            /**
             * When a delimiter is unclosed.
             * Description inputs: $1: unclosed token, $2: opening delimiter
             * */
            UnclosedDelimiter: InternalConflictText;
        }> &
        Exceptions<{
            /** When an unparsable thing is evaluated */
            UnparsableException: ExceptionText;
        }>;
    /**
     * A table update expression, e.g. `table ⎡: one: 1 ⎦ one < 1`
     * Start inputs: $1 = the table
     * Finish inputs: $1 = resulting value
     */
    Update: NodeText &
        ExpressionText &
        Conflicts<{
            /** When a column name was expected but not given */
            ExpectedColumnBind: InternalConflictText;
            /**
             * When a value was given that didn't match the expected type of the column
             * Description inputs: $1: expected type, $2: given type
             * */
            IncompatibleCellType: ConflictText;
        }>;
    /** Any type. Not actually written in code, but can be generated internally. */
    AnyType: NodeText;
    /** A boolean type, e.g., `?` */
    BooleanType: NodeText;
    /** A conversion type, e.g., `? → ''` */
    ConversionType: NodeText;
    /** A formatted type, e.g., ` `` ` */
    FormattedType: NodeText;
    /** An exception type, e.g., `!` */
    ExceptionType: NodeText;
    /** A function type, e.g., `ƒ(magic•#)•#` */
    FunctionType: DescriptiveNodeText;
    /**
     * A list type, e.g., `[#]`
     * Description inputs: $1 = item type or undefined
     */
    ListType: DescriptiveNodeText;
    /**
     * A map type, e.g., `{#:#}`
     * Description inputs: $1 = Key type or undefined, $2 = value type or undefined
     */
    MapType: DescriptiveNodeText;
    /**
     * A number type, e.g., `#m`
     * Description inputs: $1 = the unit or undefined
     */
    NumberType: DescriptiveNodeText;
    /**
     * A named type, e.g., `Kitty`
     * Description inputs: $1 = the type name
     */
    NameType: DescriptiveNodeText &
        Conflicts<{
            /**
             * A type representing an unknown name
             * Description inputs: $1 = Invalid type
             * */
            UnknownTypeName: InternalConflictText;
        }>;
    /**
     * A type that is not possible
     */
    NeverType: NodeText;
    /**
     * A type representing nothing, e.g., `ø`
     */
    NoneType: NodeText;
    /**
     * A set type, e.g., `{#}`
     * Description inputs: $1 = type or undefined
     */
    SetType: DescriptiveNodeText;
    /** A type of stream, internally generated */
    StreamDefinitionType: NodeText;
    /** A type of stream, e.g., `… #` */
    StreamType: NodeText;
    /**
     * A structure type, internally generated to represent a structure definition.
     * Description inputs: $1 = name of structure
     */
    StructureType: DescriptiveNodeText;
    /**
     * A table type, e.g., `⎡a•# b•"" c•Cat⎦`
     */
    TableType: NodeText &
        Conflicts<{
            /**
             * When a column's type is missing
             * Description inputs: $1 = The missing column */
            ExpectedColumnType: InternalConflictText;
        }>;
    /**
     * A text type, e.g., `''`
     * Description inputs: $1 = concrete type or undefined
     */
    TextType: DescriptiveNodeText;
    /**
     * A type placeholder, `_`
     */
    TypePlaceholder: NodeText;
    /**
     * Two possible types, e.g., `# | ''`
     * Description inputs: $1 = first type, $2 = second type
     */
    UnionType: DescriptiveNodeText;
    /**
     * A type that can't be parsed.
     */
    UnparsableType: NodeText;
    /**
     * A unit of a number, e.g., `m` in `1m`
     * Description inputs: $1 = unit description
     */
    Unit: DescriptiveNodeText;
    /**
     * A type representing an unknown type variable
     */
    VariableType: NodeText;
    /**
     * A type that is not known. All unknown types are rendered as a sequence of reasons, e.g., 'unknown type because X because Y because Z..."".
     * The unknown type description is used for the beginning of this message, and then the connector below is used to string them together. */
    UnknownType: NodeText & {
        /** The connector between reasons, e.g., "because " */
        connector: string;
    };
    /**
     * A type representing an unknown named type, e.g., `b` in `a: b + 1`
     * Description inputs: $1 = name that's not known or undefined
     */
    UnknownNameType: DescriptiveNodeText;
    /** A type that depends on itself and is therefore unknown, e.g., `a: a + 1`. */
    CycleType: DescriptiveNodeText;
    /** A variable type that is not defined, e.g., `C` in `ƒ help⸨A⸩(b•C)` */
    UnknownVariableType: NodeText;
    /** An unknown type because no expression was given in a block, e.g., () */
    NoExpressionType: NodeText;
    /** An unknown type because `.` is not defined in scope, e.g., `a: 1 + .` */
    NotEnclosedType: NodeText;
    /** An unknown type because of a placeholder expression, e.g., `a: 1 + _` */
    NotImplementedType: NodeText;
    /**
     * Something that does not have a specific expected type, e.g., `list['hi']`
     * Description inputs: $1 = type expected
     */
    NotAType: DescriptiveNodeText;
    /**
     * Non-function type, e.g., `1(2 3)`
     * Description inputs: $1 = the type of the given function
     * */
    NonFunctionType: DescriptiveNodeText;
};

export { type NodeTexts as default };
