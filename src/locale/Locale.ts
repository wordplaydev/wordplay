import type LanguageCode from './LanguageCode';
import type Node from '@nodes/Node';
import type Emotion from '../lore/Emotion';
import Token from '@nodes/Token';
import TokenType from '../nodes/TokenType';

export type Template = string;
export type DocString = string;

export type NameAndDoc = {
    names: NameText;
    doc: DocText;
};

export type FixedArray<N extends number, T> = N extends 0
    ? never[]
    : {
          0: T;
          length: N;
      } & ReadonlyArray<T>;

export type ConceptText<
    Steps extends number,
    Names extends number
> = NameAndDoc;

export type NodeText = {
    /* The name that should be used to refer to the node type */
    name: string;
    /* A description of what the node is. More specific than a name. If not provided, name is used. */
    description: Template;
    /* Documentation text that appears in the documentation view */
    doc: DocString;
    /* The emotion that should be conveyed in animations of the node type */
    emotion: `${Emotion}`;
};

export interface AtomicExpressionText {
    start: Template;
}

export interface ExpressionText extends AtomicExpressionText {
    finish: Template;
}

export type InternalConflictText = Template;
export type ConflictText = { primary: Template; secondary: Template };

export type FunctionText<Inputs> = {
    name: NameText;
    doc: DocText;
    inputs: Inputs;
};

export type NameText = string | string[];

export type DocText = string;

export function getFirstName(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

export function getTokenLabel(token: Node, translation: Locale): string {
    if (!(token instanceof Token)) return token.getLabel(translation);

    const tokenType = Object.entries(TokenType).find(
        ([, val]) => val === token.types[0]
    );
    const tokenLabel = tokenType
        ? translation.token[tokenType[0] as keyof typeof TokenType]
        : '';
    return tokenLabel;
}

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
type Locale = {
    /** An ISO 639-1 language code */
    language: LanguageCode;
    /** The placeholder string indicating that a locale string is not yet written */
    tbd: string;
    /** The name of the Wordplay project */
    wordplay: string;
    /** Used to address someone or say hi, on the login screen. */
    welcome: string;
    /** The motto for Wordplay on the landing page. */
    motto: string;
    terminology: {
        store: string;
        code: string;
        decide: string;
        project: string;
        source: string;
        input: string;
        output: string;
        act: string;
        scene: string;
        phrase: string;
        group: string;
        verse: string;
        type: string;
        /** What to call the main source in a project. */
        start: string;
        /** How to describe output that has entered for the first time */
        entered: string;
        /** How to describe output that has changed */
        changed: string;
        /** How to refer to names that things have */
        name: string;
    };
    /** A way to say "before [description]" */
    caret: {
        before: Template;
        inside: Template;
    };
    data: {
        value: string;
        boolean: string;
        table: string;
        list: string;
        map: string;
        text: string;
        measurement: string;
        function: string;
        none: string;
        exception: string;
        row: string;
        set: string;
        structure: string;
        streamdefinition: string;
        stream: string;
        index: string;
        query: string;
        key: string;
    };
    evaluation: {
        done: Template;
        unevaluated: Template;
    };
    token: Record<keyof typeof TokenType, string>;
    node: NodeTexts;
    native: {
        bool: {
            doc: DocText;
            name: NameText;
            function: {
                and: FunctionText<[NameAndDoc]>;
                or: FunctionText<[NameAndDoc]>;
                not: FunctionText<[]>;
                equals: FunctionText<[NameAndDoc]>;
                notequal: FunctionText<[NameAndDoc]>;
            };
            conversion: {
                text: DocText;
            };
        };
        none: {
            doc: DocText;
            name: NameText;
            function: {
                equals: FunctionText<[NameAndDoc]>;
                notequals: FunctionText<[NameAndDoc]>;
            };
            conversion: {
                text: DocText;
            };
        };
        text: {
            doc: DocText;
            name: NameText;
            function: {
                length: FunctionText<[]>;
                equals: FunctionText<[NameAndDoc]>;
                notequals: FunctionText<[NameAndDoc]>;
                repeat: FunctionText<[NameAndDoc]>;
                segment: FunctionText<[NameAndDoc]>;
                combine: FunctionText<[NameAndDoc]>;
                has: FunctionText<[NameAndDoc]>;
            };
            conversion: {
                text: DocText;
                number: DocText;
            };
        };
        measurement: {
            doc: DocText;
            name: NameText;
            function: {
                add: FunctionText<[NameAndDoc]>;
                subtract: FunctionText<[NameAndDoc]>;
                multiply: FunctionText<[NameAndDoc]>;
                divide: FunctionText<[NameAndDoc]>;
                remainder: FunctionText<[NameAndDoc]>;
                truncate: FunctionText<[NameAndDoc]>;
                absolute: FunctionText<[NameAndDoc]>;
                power: FunctionText<[NameAndDoc]>;
                root: FunctionText<[NameAndDoc]>;
                lessThan: FunctionText<[NameAndDoc]>;
                greaterThan: FunctionText<[NameAndDoc]>;
                lessOrEqual: FunctionText<[NameAndDoc]>;
                greaterOrEqual: FunctionText<[NameAndDoc]>;
                equal: FunctionText<[NameAndDoc]>;
                notequal: FunctionText<[NameAndDoc]>;
                cos: FunctionText<[]>;
                sin: FunctionText<[]>;
            };
            conversion: {
                text: DocText;
                list: DocText;
                s2m: DocText;
                s2h: DocText;
                s2day: DocText;
                s2wk: DocText;
                s2year: DocText;
                s2ms: DocText;
                ms2s: DocText;
                min2s: DocText;
                h2s: DocText;
                day2s: DocText;
                wk2s: DocText;
                yr2s: DocText;
                m2pm: DocText;
                m2nm: DocText;
                m2micro: DocText;
                m2mm: DocText;
                m2cm: DocText;
                m2dm: DocText;
                m2km: DocText;
                m2Mm: DocText;
                m2Gm: DocText;
                m2Tm: DocText;
                pm2m: DocText;
                nm2m: DocText;
                micro2m: DocText;
                mm2m: DocText;
                cm2m: DocText;
                dm2m: DocText;
                km2m: DocText;
                Mm2m: DocText;
                Gm2m: DocText;
                Tm2m: DocText;
                km2mi: DocText;
                mi2km: DocText;
                cm2in: DocText;
                in2cm: DocText;
                m2ft: DocText;
                ft2m: DocText;
                g2mg: DocText;
                mg2g: DocText;
                g2kg: DocText;
                kg2g: DocText;
                g2oz: DocText;
                oz2g: DocText;
                oz2lb: DocText;
                lb2oz: DocText;
            };
        };
        list: {
            doc: DocText;
            name: NameText;
            kind: NameText;
            out: NameText;
            outofbounds: NameText;
            function: {
                add: FunctionText<[NameAndDoc]>;
                append: FunctionText<[NameAndDoc]>;
                replace: FunctionText<[NameAndDoc, NameAndDoc]>;
                length: FunctionText<[]>;
                random: FunctionText<[]>;
                first: FunctionText<[]>;
                last: FunctionText<[]>;
                has: FunctionText<[NameAndDoc]>;
                join: FunctionText<[NameAndDoc]>;
                sansFirst: FunctionText<[]>;
                sansLast: FunctionText<[]>;
                sans: FunctionText<[NameAndDoc]>;
                sansAll: FunctionText<[NameAndDoc]>;
                reverse: FunctionText<[]>;
                equals: FunctionText<[NameAndDoc]>;
                notequals: FunctionText<[NameAndDoc]>;
                translate: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                    index: NameAndDoc;
                };
                filter: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
                all: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
                until: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
                find: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
                combine: FunctionText<[NameAndDoc, NameAndDoc]> & {
                    combination: NameAndDoc;
                    next: NameAndDoc;
                    index: NameAndDoc;
                };
            };
            conversion: {
                text: DocText;
                set: DocText;
            };
        };
        set: {
            doc: DocText;
            name: NameText;
            kind: NameText;
            function: {
                equals: FunctionText<[NameAndDoc]>;
                notequals: FunctionText<[NameAndDoc]>;
                add: FunctionText<[NameAndDoc]>;
                remove: FunctionText<[NameAndDoc]>;
                union: FunctionText<[NameAndDoc]>;
                intersection: FunctionText<[NameAndDoc]>;
                difference: FunctionText<[NameAndDoc]>;
                filter: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
                translate: FunctionText<[NameAndDoc]> & {
                    value: NameAndDoc;
                };
            };
            conversion: {
                text: DocText;
                list: DocText;
            };
        };
        map: {
            doc: DocText;
            name: NameText;
            key: NameText;
            value: NameText;
            result: NameText;
            function: {
                equals: FunctionText<[NameAndDoc]>;
                notequals: FunctionText<[NameAndDoc]>;
                set: FunctionText<[NameAndDoc, NameAndDoc]>;
                unset: FunctionText<[NameAndDoc]>;
                remove: FunctionText<[NameAndDoc]>;
                filter: FunctionText<[NameAndDoc]> & {
                    key: NameAndDoc;
                    value: NameAndDoc;
                };
                translate: FunctionText<[NameAndDoc]> & {
                    key: NameAndDoc;
                    value: NameAndDoc;
                };
            };
            conversion: {
                text: DocText;
                set: DocText;
                list: DocText;
            };
        };
    };
    exceptions: {
        /** No inputs */
        blank: Template;
        /** $1: Name of function not found in scope */
        function: Template;
        /** $1: Scope in which name was not found */
        name: Template;
        /** $1: Borrow that it depends on */
        cycle: Template;
        /** $1: The function that was evaluated too many times */
        functionlimit: Template;
        /** No inputs */
        steplimit: Template;
        /**
         * $1 = expected type
         * $2 = received type
         */
        type: Template;
        /** No inputs */
        placeholder: Template;
        /** No inputs */
        unparsable: Template;
        /** No inputs */
        value: Template;
    };
    conflict: {
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
    step: {
        stream: Template;
        jump: Template;
        /** $1: true if jumping */
        jumpif: Template;
        halt: Template;
        initialize: Template;
        evaluate: Template;
        next: Template;
        check: Template;
    };
    transform: {
        /** $1: node description */
        add: Template;
        /** $1: node description */
        append: Template;
        /** $1: node description */
        remove: Template;
        /** $1: node description or undefined */
        replace: Template;
    };
    ui: {
        placeholders: {
            code: string;
            expression: string;
            type: string;
            percent: string;
            name: string;
            project: string;
            email: string;
        };
        tooltip: {
            yes: string;
            no: string;
            play: string;
            pause: string;
            back: string;
            backInput: string;
            out: string;
            start: string;
            forward: string;
            forwardInput: string;
            present: string;
            reset: string;
            home: string;
            revert: string;
            set: string;
            fullscreen: string;
            collapse: string;
            expand: string;
            close: string;
            language: string;
            horizontal: string;
            vertical: string;
            freeform: string;
            fit: string;
            grid: string;
            addPose: string;
            removePose: string;
            movePoseUp: string;
            movePoseDown: string;
            addGroup: string;
            addPhrase: string;
            removeContent: string;
            moveContentUp: string;
            moveContentDown: string;
            editContent: string;
            sequence: string;
            animate: string;
            addSource: string;
            deleteSource: string;
            deleteProject: string;
            editProject: string;
            settings: string;
            newProject: string;
            dark: string;
            chooserExpand: string;
            place: string;
            paint: string;
            nextLesson: string;
            previousLesson: string;
            nextLessonStep: string;
            previousLessonStep: string;
            revertProject: string;
        };
        prompt: {
            deleteSource: string;
            deleteProject: string;
        };
        labels: {
            learn: string;
            nodoc: string;
            /** Shown in the output palette when multiple outputs are selected but they have unequal values. */
            mixed: string;
            /** Shown in the output palette when the output(s) selected have expressions that are not editable using the editor. */
            computed: string;
            /** Shown in the output palette when the output(s) selected have no value set, but have a default */
            default: string;
            /** Shown in the output palette when a value is unset but is inherited */
            inherited: string;
            /** Shown in the output palette when a sequence isn't valid */
            notSequence: string;
            /** Shown in the output palette when a list of content is isn't valid */
            notContent: string;
            /** Shown when using an anonymous account */
            anonymous: string;
        };
        tiles: {
            output: string;
            docs: string;
            palette: string;
        };
        headers: {
            learn: string;
            editing: string;
            projects: string;
            examples: string;
        };
        section: {
            project: string;
            conflicts: string;
            timeline: string;
            toolbar: string;
            output: string;
            palette: string;
            editor: string;
        };
        feedback: {
            unknownProject: string;
        };
        login: {
            header: string;
            prompt: string;
            anonymousPrompt: string;
            enterEmail: string;
            submit: string;
            sent: string;
            success: string;
            failure: string;
            expiredFailure: string;
            invalidFailure: string;
            emailFailure: string;
            logout: string;
            offline: string;
        };
        edit: {
            wrap: string;
            unwrap: string;
            bind: string;
        };
    };
    input: InputTexts;
    output: OutputTexts;
    animation: {
        sway: NameAndDoc & { angle: NameAndDoc };
        bounce: NameAndDoc & { height: NameAndDoc };
        spin: NameAndDoc;
        fadein: NameAndDoc;
        popup: NameAndDoc;
        shake: NameAndDoc;
    };
    tutorial: Tutorial;
};

export type NodeTexts = {
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

export type OutputTexts = {
    Type: ConceptText<1, 0> & {
        size: NameAndDoc;
        family: NameAndDoc;
        place: NameAndDoc;
        rotation: NameAndDoc;
        name: NameAndDoc;
        selectable: NameAndDoc;
        enter: NameAndDoc;
        rest: NameAndDoc;
        move: NameAndDoc;
        exit: NameAndDoc;
        duration: NameAndDoc;
        style: NameAndDoc;
    };
    Group: ConceptText<1, 0> & {
        content: NameAndDoc;
        layout: NameAndDoc;
    };
    Phrase: ConceptText<1, 0> & {
        text: NameAndDoc;
    };
    Stage: ConceptText<1, 0> & {
        /**
         *
         * @param total output
         * @param phrases total
         * @param groups total
         * @returns
         */
        description: Template;
        content: NameAndDoc;
        background: NameAndDoc;
        frame: NameAndDoc;
    };
    Arrangement: ConceptText<1, 0>;
    Shape: ConceptText<1, 0>;
    Rectangle: ConceptText<1, 0> & {
        left: NameAndDoc;
        top: NameAndDoc;
        right: NameAndDoc;
        bottom: NameAndDoc;
    };
    Pose: ConceptText<1, 0> & {
        duration: NameAndDoc;
        style: NameAndDoc;
        color: NameAndDoc;
        opacity: NameAndDoc;
        offset: NameAndDoc;
        tilt: NameAndDoc;
        scale: NameAndDoc;
        flipx: NameAndDoc;
        flipy: NameAndDoc;
    };
    Sequence: ConceptText<1, 0> & {
        count: NameAndDoc;
        timing: NameAndDoc;
        poses: NameAndDoc;
    };
    Color: ConceptText<1, 0> & {
        lightness: NameAndDoc;
        chroma: NameAndDoc;
        hue: NameAndDoc;
    };
    Place: ConceptText<1, 0> & {
        x: NameAndDoc;
        y: NameAndDoc;
        z: NameAndDoc;
    };
    Row: ConceptText<1, 0> & {
        /**
         * $1 total count
         * $2 phrase count
         * $3 group count
         */
        description: Template;
        padding: NameAndDoc;
    };
    Stack: ConceptText<1, 0> & {
        /**
         * $1 total count
         * $2 phrase count
         * $3 group count
         */
        description: Template;
        padding: NameAndDoc;
    };
    Grid: ConceptText<1, 0> & {
        /**
         *
         * $1: rows
         * $2: columns
         */
        description: Template;
        rows: NameAndDoc;
        columns: NameAndDoc;
        padding: NameAndDoc;
        cellWidth: NameAndDoc;
        cellHeight: NameAndDoc;
    };
    Free: ConceptText<1, 0> & {
        /**
         * $1: output count
         */
        description: Template;
    };
    Easing: {
        // CSS linear
        straight: NameText;
        // CSS ease-in
        pokey: NameText;
        // CSS ease-in-out
        cautious: NameText;
        // CSS ease-out
        zippy: NameText;
    };
};

export type InputTexts = {
    Random: ConceptText<1, 0> & {
        min: NameAndDoc;
        max: NameAndDoc;
    };
    Choice: ConceptText<1, 0>;
    Button: ConceptText<1, 0> & { down: NameAndDoc };
    Pointer: ConceptText<1, 0>;
    Key: ConceptText<1, 0> & {
        key: NameAndDoc;
        down: NameAndDoc;
    };
    Time: ConceptText<1, 0> & { frequency: NameAndDoc };
    Mic: ConceptText<1, 0> & {
        frequency: NameAndDoc;
    };
    Camera: ConceptText<1, 0> & {
        width: NameAndDoc;
        height: NameAndDoc;
        frequency: NameAndDoc;
    };
    Reaction: ConceptText<1, 0>;
    Motion: ConceptText<1, 0> & {
        type: NameAndDoc;
        vx: NameAndDoc;
        vy: NameAndDoc;
        vz: NameAndDoc;
        vangle: NameAndDoc;
        mass: NameAndDoc;
        gravity: NameAndDoc;
        bounciness: NameAndDoc;
    };
};

export type UnitText = {
    name: string;
    overview: Dialog[];
};

export type Character =
    | keyof NodeTexts
    | keyof InputTexts
    | keyof OutputTexts
    | '⊤'
    | '⊥';

export type Dialog = {
    concept: Character;
    emotion: Emotion;
    text: string;
};

export type Tutorial = Act[];

export type Act = {
    name: string;
    program: Code;
    scenes: Scene[];
};

export type Line = Dialog | Code | null;

export type Scene = {
    name: string;
    program: Code;
    concept: string | undefined;
    lines: Line[];
};

export type Code = {
    /** The source files for the project */
    sources: string[];
    /** Fits viewport to output if true */
    fit: boolean;
    /** Shows code if true, otherwise output only */
    edit: boolean;
    /** True if the conflicts are intentional. Used to filter out intentioally conflicted programs in testing */
    conflicted: boolean;
};

export function dialog(
    concept: Character,
    emotion: Emotion,
    text: string
): Dialog {
    return {
        concept,
        emotion,
        text,
    };
}

export function code(
    source: string,
    fit: boolean,
    edit: boolean,
    conflicted: boolean = false
): Code {
    return {
        sources: [source],
        fit,
        edit,
        conflicted,
    };
}

export function output(source: string, fit: boolean = true): Code {
    return {
        sources: [source],
        fit,
        edit: false,
        conflicted: false,
    };
}

export function edit(source: string, conflicted: boolean = false): Code {
    return code(source, true, true, conflicted);
}

export function pause() {
    return null;
}

export function symbol(symbol: string) {
    return output(`Phrase("${symbol}")`);
}

export default Locale;
