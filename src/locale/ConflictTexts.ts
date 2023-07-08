import type { Template } from './Locale';

export type InternalConflictText = Template;
export type ConflictText = { primary: Template; secondary: Template };

type ConflictTexts = {
    /** $1: borrow that had a cycle */
    BorrowCycle: InternalConflictText;
    /** $1: The name that depends on itself */
    ReferenceCycle: InternalConflictText;
    DisallowedInputs: InternalConflictText;
    /** $1: The name that shadowed this one */
    DuplicateName: ConflictText;
    /** $1: The duplicate */
    DuplicateShare: ConflictText;
    /** $1: The duplicate */
    DuplicateTypeVariable: ConflictText;
    /** $1: The non-boolean expression */
    ExpectedBooleanCondition: ConflictText;
    /** $: The missing column */
    ExpectedColumnType: InternalConflictText;
    ExpectedEndingExpression: InternalConflictText;
    /** $1: The select expression */
    ExpectedSelectName: InternalConflictText;
    ExpectedUpdateBind: InternalConflictText;
    IgnoredExpression: ConflictText;
    IncompleteImplementation: InternalConflictText;
    /**
     * $1: Expected
     * $2: Given
     * */
    IncompatibleBind: ConflictText;
    /**
     * $1: Expected
     * $2: Given
     * */
    IncompatibleCellType: ConflictText;
    /**
     * $1: Expected
     * $2: Given
     * */
    IncompatibleInput: ConflictText;
    /**
     * $1: Expected
     * $2: Given
     * */
    IncompatibleKey: ConflictText;
    ImpossibleType: InternalConflictText;
    InvalidLanguage: InternalConflictText;
    InvalidRow: InternalConflictText;
    /**
     * $1: Definition
     * $2: Type
     * */
    InvalidTypeInput: ConflictText;
    MisplacedConversion: InternalConflictText;
    MisplacedInput: InternalConflictText;
    MisplacedShare: InternalConflictText;
    MisplacedThis: InternalConflictText;
    /**
     * $1: Column
     * $2: Row
     * */
    MissingCell: ConflictText;
    /**
     * $1: Missing input
     * $2: Evaluate that is missing input
     * */
    MissingInput: ConflictText;
    MissingLanguage: InternalConflictText;
    MissingShareLanguages: InternalConflictText;
    NoExpression: InternalConflictText;
    /**
     * $1: Expression that's not a map
     * */
    NotAMap: ConflictText;
    NotANumber: InternalConflictText;
    NotAnInterface: InternalConflictText;
    NotInstantiable: InternalConflictText;
    OrderOfOperations: InternalConflictText;
    Placeholder: InternalConflictText;
    RequiredAfterOptional: InternalConflictText;
    /**
     * $1: Unclosed token
     * $2: Opening delimiter
     * */
    UnclosedDelimiter: InternalConflictText;
    UnexpectedEtc: InternalConflictText;
    /**
     * $1: Evaluate with unexected input
     * $2: Unexpected input
     * */
    UnexpectedInput: ConflictText;
    UnexpectedTypeVariable: InternalConflictText;
    /**
     * $1: Interface
     * $2: Function
     * */
    UnimplementedInterface: InternalConflictText;
    UnknownBorrow: InternalConflictText;
    UnknownColumn: InternalConflictText;
    /**
     * $1: From type
     * $2: To type
     * */
    UnknownConversion: InternalConflictText;
    UnknownInput: InternalConflictText;
    /**
     * $1: Scope
     * */
    UnknownName: InternalConflictText;
    /**
     * $1: Invalid type
     * */
    InvalidTypeName: InternalConflictText;
    Unnamed: InternalConflictText;
    /**
     * $1: True if expression, false if type
     * */
    UnparsableConflict: InternalConflictText;
    UnusedBind: InternalConflictText;
    InputListMustBeLast: InternalConflictText;
};

export default ConflictTexts;
