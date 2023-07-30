import type { DocText, Template } from './Locale';
import type Emotion from '../lore/Emotion';

export type NodeText = {
    /* The name that should be used to refer to the node type */
    name: string;
    /* Documentation text that appears in the documentation view */
    doc: DocText;
    /* The emotion that should be conveyed in animations of the node type */
    emotion: `${Emotion}`;
};

export type DescriptiveNodeText = NodeText & {
    /* A precise description of the node's contents, more specific than a name. If not provided, name is used. */
    description: Template;
};

export interface AtomicExpressionText {
    start: Template;
}

export interface ExpressionText extends AtomicExpressionText {
    finish: Template;
}

export interface Conflicts<T> {
    conflict: T;
}

export type InternalConflictText = Template;
export type ConflictText = { primary: Template; secondary: Template };

export interface Exceptions<T> {
    exception: T;
}

export interface ExceptionText {
    description: Template;
    explanation: Template;
}

type NodeTexts = {
    Dimension: DescriptiveNodeText;
    Doc: NodeText;
    Docs: NodeText & AtomicExpressionText;
    KeyValue: NodeText;
    Language: DescriptiveNodeText &
        Conflicts<{
            UnknownLanguage: InternalConflictText;
            MissingLanguage: InternalConflictText;
        }>;
    /**
     * Description
     * $1: name or undefined
     */
    Name: DescriptiveNodeText;
    Names: NodeText;
    Row: NodeText &
        Conflicts<{
            InvalidRow: InternalConflictText;
            /**
             * $1: Column
             * $2: Row
             * */
            MissingCell: ConflictText;
            UnknownColumn: InternalConflictText;
        }>;
    /**
     * Description
     * $1: token label
     * $2: token text
     */
    Token: DescriptiveNodeText;
    TypeInputs: NodeText;
    TypeVariable: NodeText &
        Conflicts<{
            /** $1: The duplicate */
            DuplicateTypeVariable: ConflictText;
        }>;
    TypeVariables: NodeText;
    /**
     * Description
     * $: paragraph count
     */
    Markup: DescriptiveNodeText;
    /**
     * Description
     * $1: number
     * $1: unit
     * Start
     * $1: the node
     */
    Paragraph: NodeText;
    /**
     * Description
     * $1: the url
     */
    WebLink: DescriptiveNodeText;
    /**
     * Description
     * $1: the concept name
     */
    ConceptLink: DescriptiveNodeText;
    Words: NodeText;
    Example: NodeText;
    /**
     * Description
     * $1: the name or number mentioned
     */
    Mention: DescriptiveNodeText;
    Branch: NodeText;
    /**
     * Description
     * $1: the operator
     * Start
     * $1: left expression
     * Finish
     * $1: result
     */
    BinaryEvaluate: DescriptiveNodeText &
        ExpressionText & {
            right: Template;
        } & Conflicts<{ OrderOfOperations: InternalConflictText }>;
    /**
     * Description
     * $1: name bound
     * Start
     * $1: bind evaluating
     * Finish
     * $1: resulting value
     * $2: names bound
     */
    Bind: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /** $1: The name that shadowed this one */
            DuplicateName: ConflictText;
            /** $1: The duplicate */
            DuplicateShare: ConflictText;
            /**
             * $1: Expected
             * $2: Given
             * */
            IncompatibleType: ConflictText;
            MisplacedShare: InternalConflictText;
            MissingShareLanguages: InternalConflictText;
            RequiredAfterOptional: InternalConflictText;
            UnexpectedEtc: InternalConflictText;
            UnusedBind: InternalConflictText;
        }>;
    /**
     * Description
     * $1: # of statements
     * Start
     * No inputs
     * Finish
     * $1: Resulting value
     */
    Block: DescriptiveNodeText &
        ExpressionText & {
            statement: Template;
        } & Conflicts<{
            ExpectedEndingExpression: InternalConflictText;
            IgnoredExpression: ConflictText;
        }>;
    /**
     * Description
     * $1: true if true, false otherwise
     */
    BooleanLiteral: DescriptiveNodeText & AtomicExpressionText;
    /**
     * Start
     * $1: source
     * $2: name borrowed
     */
    Borrow: DescriptiveNodeText &
        AtomicExpressionText & {
            source: Template;
            bind: Template;
            version: Template;
        } & Conflicts<{
            UnknownBorrow: InternalConflictText;
            /** $1: borrow that had a cycle */
            BorrowCycle: InternalConflictText;
        }> &
        Exceptions<{
            /** $1: Borrow that it depends on */
            CycleException: ExceptionText;
        }>;

    /**
     * Start
     * $1: stream that changed
     */
    Changed: NodeText & AtomicExpressionText;
    /**
     * Start
     * $1: condition to check
     * Finish
     * $1: resulting value
     */
    Conditional: NodeText &
        ExpressionText & {
            /** $1: true if jumping to the "else" expression */
            afterthen: Template;
            /** jump after the "then" expression */
            else: Template;
            condition: Template;
            yes: Template;
            no: Template;
        } & Conflicts<{
            /**
             * $1: The non-boolean expression
             * Example: 1 ?'yes' 'no'
             */
            ExpectedBooleanCondition: ConflictText;
        }>;
    ConversionDefinition: DescriptiveNodeText &
        AtomicExpressionText &
        Conflicts<{ MisplacedConversion: InternalConflictText }>;
    /**
     * Start
     * $1: expression to convert
     * Finish
     * $1: resulting value
     */
    Convert: NodeText &
        ExpressionText &
        Conflicts<{
            /**
             * $1: From type
             * $2: To type
             * */
            UnknownConversion: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * $1: From type
             * $2: To type
             */
            ConversionException: ExceptionText;
        }>;
    /**
     * Start
     * $1: table expression
     * Finish
     * $1: resulting value
     */
    Delete: NodeText & ExpressionText;
    DocumentedExpression: NodeText & AtomicExpressionText;
    /**
     * Descriptionn
     * $1: name of function being evaluated
     * Start
     * no inputs
     * Finish
     * $1: resulting value
     */
    Evaluate: DescriptiveNodeText &
        ExpressionText & {
            /** What to say after inputs are done evaluating, right before starting evaluation the function */
            evaluate: Template;
            function: Template;
            input: Template;
        } & Conflicts<{
            /**
             * $1: Expected
             * $2: Given
             * */
            IncompatibleInput: ConflictText;
            /**
             * $1: Definition
             * $2: Type
             * */
            UnexpectedTypeInput: ConflictText;
            MisplacedInput: InternalConflictText;
            /**
             * $1: Missing input
             * $2: Evaluate that is missing input
             * */
            MissingInput: ConflictText;
            NotInstantiable: InternalConflictText;
            /**
             * $1: Evaluate with unexected input
             * $2: Unexpected input
             * */
            UnexpectedInput: ConflictText;
            UnknownInput: ConflictText;
            InputListMustBeLast: InternalConflictText;
        }> &
        Exceptions<{
            /**
             * $1: Expression that didn't produce a function
             * $2: Scope not found in, or undefined
             */
            FunctionException: ExceptionText;
        }>;
    /**
     * Description
     * $1: type or undefined
     */
    ExpressionPlaceholder: DescriptiveNodeText &
        AtomicExpressionText & {
            placeholder: Template;
        } & Conflicts<{ Placeholder: InternalConflictText }> &
        Exceptions<{
            /** No inputs */
            UnimplementedException: ExceptionText;
        }>;
    /**
     * Description
     * $1: function name in locale
     */
    FunctionDefinition: DescriptiveNodeText &
        AtomicExpressionText &
        Conflicts<{
            NoExpression: InternalConflictText;
        }>;
    /**
     * Finish
     * $1: resulting value
     */
    HOF: NodeText &
        ExpressionText & {
            initialize: Template;
            next: Template;
            check: Template;
        };
    /**
     * Start
     * $1: table expression
     * Finish
     * $1: resulting value
     */
    Insert: NodeText & ExpressionText;
    Initial: NodeText;
    /**
     * Description
     * $1: The type being checked for
     * Start
     * $1: expression
     * Finish
     * $1: result
     * $2: type
     */
    Is: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{ ImpossibleType: InternalConflictText }> &
        Exceptions<{
            /**
             * $1 = expected type
             * $2 = received type
             */
            TypeException: ExceptionText;
        }>;
    /**
     * Start
     * $1: list
     * Finish
     * $1: resulting value
     */
    ListAccess: NodeText & ExpressionText;
    /**
     * Description
     * $1: item count
     * Finish
     * $1: resulting value
     */
    ListLiteral: DescriptiveNodeText &
        ExpressionText & {
            item: Template;
        };
    /**
     * Finish
     * $1: resulting value
     */
    MapLiteral: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /**
             * $1: Expression that's not a map
             * */
            NotAKeyValue: ConflictText;
        }>;
    NumberLiteral: DescriptiveNodeText &
        AtomicExpressionText &
        Conflicts<{ NotANumber: InternalConflictText }>;
    BasisExpression: NodeText & AtomicExpressionText;
    NoneLiteral: NodeText & AtomicExpressionText;
    /**
     * Start
     * $1: the stream expression being checked
     * Finish
     * $1: resulting value
     */
    Previous: NodeText & ExpressionText;
    /**
     * Start
     * $1: a stream that changed
     * Finish
     * $1: resulting value
     */
    Program: NodeText &
        ExpressionText & {
            halt: Template;
            done: Template;
            unevaluated: Template;
        } & Exceptions<{
            /** No inputs */ BlankException: ExceptionText;
            /** $1: The function that was evaluated too many times */
            EvaluationLimitException: ExceptionText;
            /** No inputs */
            StepLimitException: ExceptionText;
            ValueException: ExceptionText;
        }>;
    /**
     * Description
     * $1: the name being refined
     * Finish
     * $1: revised property
     * $2: revised value
     */
    PropertyBind: DescriptiveNodeText & ExpressionText;
    /**
     * Finish
     * $1: revised property
     * $1: revised value
     */
    PropertyReference: DescriptiveNodeText &
        ExpressionText & {
            property: Template;
        };
    /**
     * Finish
     * $1: resulting value
     */
    Reaction: NodeText &
        ExpressionText & {
            initial: Template;
            condition: Template;
            next: Template;
        } & Conflicts<{ ExpectedStream: InternalConflictText }>;
    /**
     * Description
     * $1: the name
     * Start
     * $1: the name being resolved
     */
    Reference: DescriptiveNodeText &
        AtomicExpressionText & {
            name: Template;
        } & Conflicts</** $1: The name that depends on itself */
        {
            /**
             * $1: Scope
             * */
            UnknownName: InternalConflictText;
            ReferenceCycle: InternalConflictText;
            UnexpectedTypeVariable: InternalConflictText;
        }> &
        Exceptions<{
            /** $1: Scope in which name was not found */
            NameException: ExceptionText;
        }>;
    /**
     * Finish
     * $1: the table
     * $1: the result
     */
    Select: NodeText &
        ExpressionText &
        Conflicts<{
            /** $1: The select expression */
            ExpectedSelectName: InternalConflictText;
        }>;
    /**
     * Finish
     * $1: the new set
     */
    SetLiteral: DescriptiveNodeText & ExpressionText;
    /**
     * Finish
     * $1: the set/map value
     */
    SetOrMapAccess: NodeText &
        ExpressionText &
        Conflicts<{
            /**
             * $1: Expected
             * $2: Given
             * */
            IncompatibleKey: ConflictText;
        }>;
    Source: NodeText;
    StreamDefinition: NodeText & AtomicExpressionText;
    /**
     * Description
     * $1: name of the structure
     */
    StructureDefinition: DescriptiveNodeText &
        AtomicExpressionText &
        Conflicts<{
            DisallowedInputs: InternalConflictText;
            IncompleteImplementation: InternalConflictText;
            NotAnInterface: InternalConflictText;
            /**
             * $1: Interface
             * $2: Function
             * */
            UnimplementedInterface: InternalConflictText;
        }>;
    /**
     * Description
     * $1: the number of rows
     * Finish
     * $1: resulting table
     */
    TableLiteral: DescriptiveNodeText &
        ExpressionText & {
            item: Template;
        };
    Template: NodeText & ExpressionText;
    /**
     * Description
     * $1: the text
     */
    TextLiteral: DescriptiveNodeText & AtomicExpressionText;
    /**
     * Finish
     * $1: resulting value
     */
    This: NodeText &
        AtomicExpressionText &
        Conflicts<{ MisplacedThis: InternalConflictText }>;
    /**
     * Description
     * $1: the operator
     * Finish
     * $1: resulting value
     */
    UnaryEvaluate: DescriptiveNodeText & ExpressionText;
    UnparsableExpression: NodeText &
        AtomicExpressionText &
        Conflicts<{
            /**
             * $1: True if expression, false if type
             * */
            UnparsableConflict: InternalConflictText;
            /**
             * $1: Unclosed token
             * $2: Opening delimiter
             * */
            UnclosedDelimiter: InternalConflictText;
        }> &
        Exceptions<{
            /** No inputs */
            UnparsableException: ExceptionText;
        }>;
    /**
     * Start
     * $1: the table
     * Finish
     * $1: resulting value
     */
    Update: NodeText &
        ExpressionText &
        Conflicts<{
            ExpectedUpdateBind: InternalConflictText;
            /**
             * $1: Expected
             * $2: Given
             * */
            IncompatibleCellType: ConflictText;
        }>;
    AnyType: NodeText;
    BooleanType: NodeText;
    ConversionType: NodeText;
    DocsType: NodeText;
    ExceptionType: NodeText;
    FunctionDefinitionType: NodeText;
    FunctionType: DescriptiveNodeText;
    /**
     * Description
     * $1: Type or undefined
     */
    ListType: DescriptiveNodeText;
    /**
     * Description
     * $1: Key type or undefined
     * $2: Map type or undefined
     */
    MapType: DescriptiveNodeText;
    /**
     * Description
     * $1: The unit or undefined
     */
    NumberType: DescriptiveNodeText;
    /**
     * Description
     * $1: Type name
     */
    NameType: DescriptiveNodeText &
        Conflicts<{
            /**
             * $1: Invalid type
             * */
            UnknownTypeName: InternalConflictText;
        }>;
    NeverType: NodeText;
    NoneType: NodeText;
    /**
     * Description
     * $1: Type expected
     */
    NotAType: DescriptiveNodeText;
    /**
     * Description
     * $1: Type or undefined
     */
    SetType: DescriptiveNodeText;
    StreamDefinitionType: NodeText;
    StreamType: NodeText;
    /**
     * Description
     * $1: Name of structure
     */
    StructureDefinitionType: DescriptiveNodeText;
    TableType: NodeText &
        Conflicts<{
            /** $: The missing column */
            ExpectedColumnType: InternalConflictText;
        }>;
    /**
     * Description
     * $1: Concrete type or undefined
     */
    TextType: DescriptiveNodeText;
    TypePlaceholder: NodeText;
    /**
     * Description
     * $1: Name that's not known or undefined
     */
    UnknownNameType: DescriptiveNodeText;
    UnknownType: NodeText & { unknown: string; connector: string };
    /**
     * Description
     * $1: left
     * $2: right
     */
    UnionType: DescriptiveNodeText;
    UnparsableType: NodeText;
    /**
     * Description
     * $1: unit description
     */
    Unit: DescriptiveNodeText;
    VariableType: NodeText;
    CycleType: DescriptiveNodeText;
    UnknownVariableType: NodeText;
    NoExpressionType: NodeText;
    NotEnclosedType: NodeText;
    NotImplementedType: NodeText;
};

export default NodeTexts;
