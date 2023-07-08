import type { NodeText } from './NodeText';
import type { Template } from './Locale';

export interface AtomicExpressionText {
    start: Template;
}

export interface ExpressionText extends AtomicExpressionText {
    finish: Template;
}

type NodeTexts = {
    Dimension: NodeText;
    Doc: NodeText;
    Docs: NodeText;
    KeyValue: NodeText;
    Language: NodeText;
    /**
     * Description
     * $1: name or undefined
     */
    Name: NodeText;
    Names: NodeText;
    Row: NodeText;
    /**
     * Description
     * $1: token label
     * $1: token text
     */
    Token: NodeText;
    TypeInputs: NodeText;
    TypeVariable: NodeText;
    TypeVariables: NodeText;
    Paragraph: NodeText;
    WebLink: NodeText;
    ConceptLink: NodeText;
    Words: NodeText;
    Example: NodeText;
    /**
     * Start
     * $1: left expression
     * Finish
     * $1: result
     */
    BinaryOperation: NodeText &
        ExpressionText & {
            right: Template;
        };
    /**
     * Start
     * $1: bind evaluating
     * Finish
     * $1: resulting value
     * $2: names bound
     */
    Bind: NodeText & ExpressionText;
    /**
     * Description
     * $1: # of statements
     * Start
     * No inputs
     * Finish
     * $1: Resulting value
     */
    Block: NodeText &
        ExpressionText & {
            statement: Template;
        };
    /**
     * Description
     * $1: true if true, false otherwise
     */
    BooleanLiteral: NodeText & AtomicExpressionText;
    /**
     * Start
     * $1: source
     * $2: name borrowed
     */
    Borrow: NodeText &
        AtomicExpressionText & {
            source: Template;
            bind: Template;
            version: Template;
        };
    /**
     * Start
     * $1: stream that changed
     */
    Changed: NodeText &
        AtomicExpressionText & {
            stream: Template;
        };
    /**
     * Start
     * $1: condition to check
     * Finish
     * $1: resulting value
     */
    Conditional: NodeText &
        ExpressionText & {
            condition: Template;
            yes: Template;
            no: Template;
        };
    ConversionDefinition: NodeText & AtomicExpressionText;
    /**
     * Start
     * $1: expression to convert
     * Finish
     * $1: resulting value
     */
    Convert: NodeText & ExpressionText;
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
    Evaluate: NodeText &
        ExpressionText & {
            function: Template;
            input: Template;
        };
    /**
     * Description
     * $1: type or undefined
     */
    ExpressionPlaceholder: NodeText &
        AtomicExpressionText & {
            placeholder: Template;
        };
    /**
     * Description
     * $1: function name in locale
     */
    FunctionDefinition: NodeText & AtomicExpressionText;
    /**
     * Finish
     * $1: resulting value
     */
    HOF: NodeText & ExpressionText;
    /**
     * Start
     * $1: table expression
     * Finish
     * $1: resulting value
     */
    Insert: NodeText & ExpressionText;
    Initial: NodeText;
    /**
     * Start
     * $1: expression
     * Finish
     * $1: result
     * $2: type
     */
    Is: NodeText & ExpressionText;
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
    ListLiteral: NodeText &
        ExpressionText & {
            item: Template;
        };
    /**
     * Finish
     * $1: resulting value
     */
    MapLiteral: NodeText & ExpressionText;
    /**
     * Description
     * $1: number
     * $1: unit
     * Start
     * $1: the node
     */
    MeasurementLiteral: NodeText & AtomicExpressionText;
    NativeExpression: NodeText & AtomicExpressionText;
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
    Program: NodeText & ExpressionText;
    /**
     * Finish
     * $1: revised property
     * $1: revised value
     */
    PropertyBind: NodeText & ExpressionText;
    /**
     * Finish
     * $1: revised property
     * $1: revised value
     */
    PropertyReference: NodeText &
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
        };
    /**
     * Description
     * $1: the name
     * Start
     * $1: the name being resolved
     */
    Reference: NodeText &
        AtomicExpressionText & {
            name: Template;
        };
    /**
     * Finish
     * $1: the table
     * $1: the result
     */
    Select: NodeText & ExpressionText;
    /**
     * Finish
     * $1: the new set
     */
    SetLiteral: NodeText & ExpressionText;
    /**
     * Finish
     * $1: the set/map value
     */
    SetOrMapAccess: NodeText & ExpressionText;
    Source: NodeText;
    StreamDefinition: NodeText & AtomicExpressionText;
    /**
     * Description
     * $1: name of the structure
     */
    StructureDefinition: NodeText & AtomicExpressionText;
    /**
     * Finish
     * $1: resulting table
     */
    TableLiteral: NodeText &
        ExpressionText & {
            item: Template;
        };
    Template: NodeText & ExpressionText;
    /**
     * Description
     * $1: the text
     */
    TextLiteral: NodeText & AtomicExpressionText;
    /**
     * Finish
     * $1: resulting value
     */
    This: NodeText & AtomicExpressionText;
    /**
     * Description
     * $1: the operator
     * Finish
     * $1: resulting value
     */
    UnaryOperation: NodeText & ExpressionText;
    UnparsableExpression: NodeText & AtomicExpressionText;
    /**
     * Start
     * $1: the table
     * Finish
     * $1: resulting value
     */
    Update: NodeText & ExpressionText;
    AnyType: NodeText;
    BooleanType: NodeText;
    ConversionType: NodeText;
    ExceptionType: NodeText;
    FunctionDefinitionType: NodeText;
    FunctionType: NodeText;
    /**
     * Description
     * $1: Type or undefined
     */
    ListType: NodeText;
    /**
     * Description
     * $1: Key type or undefined
     * $2: Map type or undefined
     */
    MapType: NodeText;
    MeasurementType: NodeText;
    /**
     * Description
     * $1: Type name
     */
    NameType: NodeText;
    NeverType: NodeText;
    NoneType: NodeText;
    /**
     * Description
     * $1: Type expected
     */
    NotAType: NodeText;
    /**
     * Description
     * $1: Type or undefined
     */
    SetType: NodeText;
    StreamDefinitionType: NodeText;
    StreamType: NodeText;
    StructureDefinitionType: NodeText;
    TableType: NodeText;
    /**
     * Description
     * $1: Concrete type or undefined
     */
    TextType: NodeText;
    TypePlaceholder: NodeText;
    /**
     * Description
     * $1: Name that's not known or undefined
     */
    UnknownNameType: NodeText;
    UnknownType: NodeText & { unknown: string; connector: string };
    /**
     * Description
     * $1: left
     * $2: right
     */
    UnionType: NodeText;
    UnparsableType: NodeText;
    /**
     * Description
     * $1: unit description
     */
    Unit: NodeText;
    VariableType: NodeText;
    CycleType: NodeText;
    UnknownVariableType: NodeText;
    NoExpressionType: NodeText;
    NotEnclosedType: NodeText;
    NotImplementedType: NodeText;
};

export default NodeTexts;
