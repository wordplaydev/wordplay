import type LanguageCode from './LanguageCode';
import type Token from '@nodes/Token';
import type UnknownType from '@nodes/UnknownType';
import type Node from '@nodes/Node';
import type Dimension from '@nodes/Dimension';
import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Context from '@nodes/Context';
import type ListType from '@nodes/ListType';
import type MapType from '@nodes/MapType';
import type MeasurementLiteral from '@nodes/MeasurementLiteral';
import type MeasurementType from '@nodes/MeasurementType';
import type NameType from '@nodes/NameType';
import type Reference from '@nodes/Reference';
import type SetType from '@nodes/SetType';
import type StreamType from '@nodes/StreamType';
import type UnionType from '@nodes/UnionType';
import type Unit from '@nodes/Unit';
import type { CycleType } from '@nodes/CycleType';
import type UnknownNameType from '@nodes/UnknownNameType';
import type NodeLink from './NodeLink';
import type Explanation from './Explanation';
import type ValueLink from './ValueLink';
import type { LanguageStyle } from './translations';
import type BooleanLiteral from '@nodes/BooleanLiteral';
import type ListLiteral from '@nodes/ListLiteral';
import type StreamDefinitionType from '../nodes/StreamDefinitionType';

export type Description = string | Explanation;
export type DocString = string;

export interface NodeTranslation<Kind> {
    description: Kind;
    doc: DocString;
}

export type StaticNodeTranslation = NodeTranslation<Description>;

export type DynamicNodeTranslation<NodeType extends Node> = NodeTranslation<
    (node: NodeType, translation: Translation, context: Context) => Description
>;

export interface AtomicExpressionTranslation<
    Start extends DescriptionOrGenerator = Description
> {
    start: Start;
}

export interface ExpressionTranslation<
    Start extends DescriptionOrGenerator = Description,
    Finish extends DescriptionOrGenerator = Description
> extends AtomicExpressionTranslation<Start> {
    finish: Finish;
}

export type DescriptionOrGenerator =
    | Description
    | ((...args: any[]) => Description);

export type InternalConflictTranslation<
    Primary extends DescriptionOrGenerator
> = {
    primary: Primary;
};

export type ConflictTranslation<
    Primary extends DescriptionOrGenerator,
    Secondary extends DescriptionOrGenerator
> = InternalConflictTranslation<Primary> & {
    secondary: Secondary;
};

export type FunctionTranslation<Inputs> = {
    name: NameTranslation;
    doc: DocTranslation;
    inputs: Inputs;
};

export type NameAndDocTranslation = {
    name: NameTranslation;
    doc: DocTranslation;
};

export type NameTranslation = string | string[];

export type DocTranslation = string;

type ValueOrUndefinedTranslation = (
    value: ValueLink | undefined
) => Description;

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
type Translation = {
    language: LanguageCode;
    style: LanguageStyle;
    welcome: string;
    placeholders: {
        code: string;
        expression: string;
        type: string;
    };
    terminology: {
        store: string;
        code: string;
        decide: string;
        project: string;
        input: string;
        output: string;
        type: string;
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
        done: Description;
        unevaluated: Description;
    };
    nodes: {
        Dimension: DynamicNodeTranslation<Dimension>;
        Doc: StaticNodeTranslation;
        Docs: StaticNodeTranslation;
        KeyValue: StaticNodeTranslation;
        Language: StaticNodeTranslation;
        Name: StaticNodeTranslation;
        Names: StaticNodeTranslation;
        Row: StaticNodeTranslation;
        Token: DynamicNodeTranslation<Token>;
        TypeInputs: StaticNodeTranslation;
        TypeVariable: StaticNodeTranslation;
        TypeVariables: StaticNodeTranslation;
        Paragraph: StaticNodeTranslation;
        WebLink: StaticNodeTranslation;
        ConceptLink: StaticNodeTranslation;
        Words: StaticNodeTranslation;
        Example: StaticNodeTranslation;
        BinaryOperation: StaticNodeTranslation &
            ExpressionTranslation<
                (left: NodeLink) => Description,
                (result: ValueLink | undefined) => Description
            > & {
                right: Description;
            };
        Bind: StaticNodeTranslation &
            ExpressionTranslation<
                (value: NodeLink | undefined) => Description,
                (value: ValueLink | undefined, names: NodeLink) => Description
            >;
        Block: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation> & {
                statement: Description;
            };
        BooleanLiteral: DynamicNodeTranslation<BooleanLiteral> &
            AtomicExpressionTranslation<(value: NodeLink) => Description>;
        Borrow: StaticNodeTranslation &
            AtomicExpressionTranslation<
                (
                    source: NodeLink | undefined,
                    name: NodeLink | undefined
                ) => Description
            > & {
                source: Description;
                bind: Description;
                version: Description;
            };
        Changed: StaticNodeTranslation &
            AtomicExpressionTranslation<(stream: NodeLink) => Description> & {
                stream: Description;
            };
        Conditional: StaticNodeTranslation &
            ExpressionTranslation<
                (condition: NodeLink) => Description,
                ValueOrUndefinedTranslation
            > & {
                condition: Description;
                yes: Description;
                no: Description;
            };
        ConversionDefinition: StaticNodeTranslation &
            AtomicExpressionTranslation;
        Convert: StaticNodeTranslation &
            ExpressionTranslation<
                (input: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Delete: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        DocumentedExpression: StaticNodeTranslation &
            AtomicExpressionTranslation;
        Evaluate: StaticNodeTranslation &
            ExpressionTranslation<
                (inputs: boolean) => Description,
                ValueOrUndefinedTranslation
            > & {
                function: Description;
                input: Description;
            };
        ExpressionPlaceholder: DynamicNodeTranslation<ExpressionPlaceholder> &
            AtomicExpressionTranslation & {
                placeholder: Description;
            };
        FunctionDefinition: StaticNodeTranslation & AtomicExpressionTranslation;
        HOF: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation>;
        Insert: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Is: StaticNodeTranslation &
            ExpressionTranslation<
                (expr: NodeLink) => Description,
                (is: boolean, type: NodeLink) => Description
            >;
        ListAccess: StaticNodeTranslation &
            ExpressionTranslation<
                (list: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        ListLiteral: DynamicNodeTranslation<ListLiteral> &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation> & {
                item: Description;
            };
        MapLiteral: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation>;
        MeasurementLiteral: DynamicNodeTranslation<MeasurementLiteral> &
            AtomicExpressionTranslation<(value: NodeLink) => Description>;
        NativeExpression: StaticNodeTranslation & AtomicExpressionTranslation;
        NoneLiteral: StaticNodeTranslation & AtomicExpressionTranslation;
        Previous: StaticNodeTranslation &
            ExpressionTranslation<
                (stream: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Program: StaticNodeTranslation &
            ExpressionTranslation<
                (
                    stream: ValueLink | undefined,
                    value: ValueLink | undefined
                ) => Description,
                ValueOrUndefinedTranslation
            >;
        PropertyReference: StaticNodeTranslation &
            ExpressionTranslation<
                Description,
                (
                    property: NodeLink | undefined,
                    value: ValueLink | undefined
                ) => Description
            > & {
                property: Description;
            };
        Reaction: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation> & {
                initial: Description;
                next: Description;
            };
        Reference: DynamicNodeTranslation<Reference> &
            AtomicExpressionTranslation<(name: NodeLink) => Description>;
        Select: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        SetLiteral: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation>;
        SetOrMapAccess: StaticNodeTranslation &
            ExpressionTranslation<
                (set: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Source: StaticNodeTranslation;
        StreamDefinition: StaticNodeTranslation & AtomicExpressionTranslation;
        StructureDefinition: StaticNodeTranslation &
            AtomicExpressionTranslation;
        TableLiteral: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation> & {
                item: Description;
            };
        Template: StaticNodeTranslation & ExpressionTranslation;
        TextLiteral: StaticNodeTranslation & AtomicExpressionTranslation;
        This: StaticNodeTranslation &
            AtomicExpressionTranslation<ValueOrUndefinedTranslation>;
        UnaryOperation: StaticNodeTranslation &
            ExpressionTranslation<
                (value: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        UnparsableExpression: StaticNodeTranslation &
            AtomicExpressionTranslation;
        Update: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        AnyType: StaticNodeTranslation;
        BooleanType: StaticNodeTranslation;
        ConversionType: StaticNodeTranslation;
        ExceptionType: StaticNodeTranslation;
        FunctionDefinitionType: StaticNodeTranslation;
        FunctionType: StaticNodeTranslation;
        ListType: DynamicNodeTranslation<ListType>;
        MapType: DynamicNodeTranslation<MapType>;
        MeasurementType: DynamicNodeTranslation<MeasurementType>;
        NameType: DynamicNodeTranslation<NameType>;
        NeverType: StaticNodeTranslation;
        NoneType: StaticNodeTranslation;
        SetType: DynamicNodeTranslation<SetType>;
        StreamDefinitionType: DynamicNodeTranslation<StreamDefinitionType>;
        StreamType: DynamicNodeTranslation<StreamType>;
        StructureDefinitionType: StaticNodeTranslation;
        TableType: StaticNodeTranslation;
        TextType: StaticNodeTranslation;
        TypePlaceholder: StaticNodeTranslation;
        UnknownType: DynamicNodeTranslation<UnknownType<any>>;
        UnionType: DynamicNodeTranslation<UnionType>;
        UnparsableType: StaticNodeTranslation;
        Unit: DynamicNodeTranslation<Unit>;
        VariableType: StaticNodeTranslation;
        CycleType: DynamicNodeTranslation<CycleType>;
        UnknownVariableType: StaticNodeTranslation;
        NotAListType: StaticNodeTranslation;
        NoExpressionType: StaticNodeTranslation;
        NotAFunctionType: StaticNodeTranslation;
        NotATableType: StaticNodeTranslation;
        NotAStreamType: StaticNodeTranslation;
        NotASetOrMapType: StaticNodeTranslation;
        NotEnclosedType: StaticNodeTranslation;
        NotImplementedType: StaticNodeTranslation;
        UnknownNameType: DynamicNodeTranslation<UnknownNameType>;
    };
    native: {
        bool: {
            doc: DocTranslation;
            name: NameTranslation;
            function: {
                and: FunctionTranslation<[NameAndDocTranslation]>;
                or: FunctionTranslation<[NameAndDocTranslation]>;
                not: FunctionTranslation<[]>;
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequal: FunctionTranslation<[NameAndDocTranslation]>;
            };
            conversion: {
                text: DocTranslation;
            };
        };
        none: {
            doc: DocTranslation;
            name: NameTranslation;
            function: {
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequals: FunctionTranslation<[NameAndDocTranslation]>;
            };
            conversion: {
                text: DocTranslation;
            };
        };
        text: {
            doc: DocTranslation;
            name: NameTranslation;
            function: {
                length: FunctionTranslation<[]>;
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequals: FunctionTranslation<[NameAndDocTranslation]>;
            };
            conversion: {
                text: DocTranslation;
                number: DocTranslation;
            };
        };
        measurement: {
            doc: DocTranslation;
            name: NameTranslation;
            function: {
                add: FunctionTranslation<[NameAndDocTranslation]>;
                subtract: FunctionTranslation<[NameAndDocTranslation]>;
                multiply: FunctionTranslation<[NameAndDocTranslation]>;
                divide: FunctionTranslation<[NameAndDocTranslation]>;
                remainder: FunctionTranslation<[NameAndDocTranslation]>;
                power: FunctionTranslation<[NameAndDocTranslation]>;
                root: FunctionTranslation<[NameAndDocTranslation]>;
                lessThan: FunctionTranslation<[NameAndDocTranslation]>;
                greaterThan: FunctionTranslation<[NameAndDocTranslation]>;
                lessOrEqual: FunctionTranslation<[NameAndDocTranslation]>;
                greaterOrEqual: FunctionTranslation<[NameAndDocTranslation]>;
                equal: FunctionTranslation<[NameAndDocTranslation]>;
                notequal: FunctionTranslation<[NameAndDocTranslation]>;
                cos: FunctionTranslation<[]>;
                sin: FunctionTranslation<[]>;
            };
            conversion: {
                text: DocTranslation;
                list: DocTranslation;
                s2m: DocTranslation;
                s2h: DocTranslation;
                s2day: DocTranslation;
                s2wk: DocTranslation;
                s2year: DocTranslation;
                s2ms: DocTranslation;
                ms2s: DocTranslation;
                min2s: DocTranslation;
                h2s: DocTranslation;
                day2s: DocTranslation;
                wk2s: DocTranslation;
                yr2s: DocTranslation;
                m2pm: DocTranslation;
                m2nm: DocTranslation;
                m2micro: DocTranslation;
                m2mm: DocTranslation;
                m2cm: DocTranslation;
                m2dm: DocTranslation;
                m2km: DocTranslation;
                m2Mm: DocTranslation;
                m2Gm: DocTranslation;
                m2Tm: DocTranslation;
                pm2m: DocTranslation;
                nm2m: DocTranslation;
                micro2m: DocTranslation;
                mm2m: DocTranslation;
                cm2m: DocTranslation;
                dm2m: DocTranslation;
                km2m: DocTranslation;
                Mm2m: DocTranslation;
                Gm2m: DocTranslation;
                Tm2m: DocTranslation;
                km2mi: DocTranslation;
                mi2km: DocTranslation;
                cm2in: DocTranslation;
                in2cm: DocTranslation;
                m2ft: DocTranslation;
                ft2m: DocTranslation;
                g2mg: DocTranslation;
                mg2g: DocTranslation;
                g2kg: DocTranslation;
                kg2g: DocTranslation;
                g2oz: DocTranslation;
                oz2g: DocTranslation;
                oz2lb: DocTranslation;
                lb2oz: DocTranslation;
            };
        };
        list: {
            doc: DocTranslation;
            name: NameTranslation;
            kind: NameTranslation;
            out: NameTranslation;
            outofbounds: NameTranslation;
            function: {
                add: FunctionTranslation<[NameAndDocTranslation]>;
                length: FunctionTranslation<[]>;
                random: FunctionTranslation<[]>;
                first: FunctionTranslation<[]>;
                last: FunctionTranslation<[]>;
                has: FunctionTranslation<[NameAndDocTranslation]>;
                join: FunctionTranslation<[NameAndDocTranslation]>;
                sansFirst: FunctionTranslation<[]>;
                sansLast: FunctionTranslation<[]>;
                sans: FunctionTranslation<[NameAndDocTranslation]>;
                sansAll: FunctionTranslation<[NameAndDocTranslation]>;
                reverse: FunctionTranslation<[]>;
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequals: FunctionTranslation<[NameAndDocTranslation]>;
                translate: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                filter: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                all: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                until: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                find: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                combine: FunctionTranslation<
                    [NameAndDocTranslation, NameAndDocTranslation]
                > & {
                    combination: NameAndDocTranslation;
                    next: NameAndDocTranslation;
                };
            };
            conversion: {
                text: DocTranslation;
                set: DocTranslation;
            };
        };
        set: {
            doc: DocTranslation;
            name: NameTranslation;
            kind: NameTranslation;
            function: {
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequals: FunctionTranslation<[NameAndDocTranslation]>;
                add: FunctionTranslation<[NameAndDocTranslation]>;
                remove: FunctionTranslation<[NameAndDocTranslation]>;
                union: FunctionTranslation<[NameAndDocTranslation]>;
                intersection: FunctionTranslation<[NameAndDocTranslation]>;
                difference: FunctionTranslation<[NameAndDocTranslation]>;
                filter: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
                translate: FunctionTranslation<[NameAndDocTranslation]> & {
                    value: NameAndDocTranslation;
                };
            };
            conversion: {
                text: DocTranslation;
                list: DocTranslation;
            };
        };
        map: {
            doc: DocTranslation;
            name: NameTranslation;
            key: NameTranslation;
            value: NameTranslation;
            result: NameTranslation;
            function: {
                equals: FunctionTranslation<[NameAndDocTranslation]>;
                notequals: FunctionTranslation<[NameAndDocTranslation]>;
                set: FunctionTranslation<
                    [NameAndDocTranslation, NameAndDocTranslation]
                >;
                unset: FunctionTranslation<[NameAndDocTranslation]>;
                remove: FunctionTranslation<[NameAndDocTranslation]>;
                filter: FunctionTranslation<[NameAndDocTranslation]> & {
                    key: NameAndDocTranslation;
                    value: NameAndDocTranslation;
                };
                translate: FunctionTranslation<[NameAndDocTranslation]> & {
                    key: NameAndDocTranslation;
                    value: NameAndDocTranslation;
                };
            };
            conversion: {
                text: DocTranslation;
                set: DocTranslation;
                list: DocTranslation;
            };
        };
    };
    exceptions: {
        function: (name: NodeLink, type: NodeLink | undefined) => Description;
        cycle: (borrow: NodeLink) => Description;
        functionlimit: (fun: NodeLink) => Description;
        steplimit: Description;
        name: (name: NodeLink, scope: ValueLink | undefined) => Description;
        type: (expected: NodeLink, received: ValueLink) => Description;
        placeholder: (expression: NodeLink) => Description;
        unparsable: (expr: NodeLink) => Description;
        value: (node: NodeLink) => Description;
    };
    conflict: {
        BorrowCycle: InternalConflictTranslation<
            (borrow: NodeLink) => Description
        >;
        ReferenceCycle: InternalConflictTranslation<
            (ref: NodeLink) => Description
        >;
        DisallowedInputs: InternalConflictTranslation<Description>;
        DuplicateName: ConflictTranslation<
            (name: NodeLink) => Description,
            (name: NodeLink) => Description
        >;
        DuplicateShare: ConflictTranslation<
            (bind: NodeLink) => Description,
            (bind: NodeLink) => Description
        >;
        DuplicateTypeVariable: ConflictTranslation<
            (duplicate: NodeLink) => Description,
            (duplicate: NodeLink) => Description
        >;
        ExpectedBooleanCondition: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        ExpectedColumnType: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        ExpectedEndingExpression: InternalConflictTranslation<Description>;
        ExpectedSelectName: InternalConflictTranslation<
            (cell: NodeLink) => Description
        >;
        ExpectedUpdateBind: InternalConflictTranslation<
            (cell: NodeLink) => Description
        >;
        IgnoredExpression: InternalConflictTranslation<Description>;
        IncompleteImplementation: InternalConflictTranslation<Description>;
        IncompatibleBind: ConflictTranslation<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        IncompatibleCellType: ConflictTranslation<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        IncompatibleInput: ConflictTranslation<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        IncompatibleKey: ConflictTranslation<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        ImpossibleType: InternalConflictTranslation<Description>;
        InvalidLanguage: InternalConflictTranslation<Description>;
        InvalidRow: InternalConflictTranslation<Description>;
        InvalidTypeInput: ConflictTranslation<
            (definition: NodeLink) => Description,
            (type: NodeLink) => Description
        >;
        MisplacedConversion: InternalConflictTranslation<Description>;
        MisplacedInput: InternalConflictTranslation<Description>;
        MisplacedShare: InternalConflictTranslation<Description>;
        MisplacedThis: InternalConflictTranslation<Description>;
        MissingCell: ConflictTranslation<
            (column: NodeLink) => Description,
            (row: NodeLink) => Description
        >;
        MissingInput: ConflictTranslation<
            (input: NodeLink) => Description,
            (evaluate: NodeLink) => Description
        >;
        MissingLanguage: InternalConflictTranslation<Description>;
        MissingShareLanguages: InternalConflictTranslation<Description>;
        NoExpression: InternalConflictTranslation<Description>;
        NonBooleanQuery: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        NotAFunction: InternalConflictTranslation<
            (
                name: NodeLink | undefined,
                given: NodeLink | undefined
            ) => Description
        >;
        NotAList: InternalConflictTranslation<(type: NodeLink) => Description>;
        NotAListIndex: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        NotAMap: ConflictTranslation<
            Description,
            (expr: NodeLink) => Description
        >;
        NotANumber: InternalConflictTranslation<Description>;
        NotAnInterface: InternalConflictTranslation<Description>;
        NotASetOrMap: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        NotAStream: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        NotAStreamIndex: InternalConflictTranslation<
            (type: NodeLink) => Description
        >;
        NotATable: InternalConflictTranslation<(type: NodeLink) => Description>;
        NotInstantiable: InternalConflictTranslation<Description>;
        OrderOfOperations: InternalConflictTranslation<Description>;
        Placeholder: InternalConflictTranslation<Description>;
        RequiredAfterOptional: InternalConflictTranslation<Description>;
        UnclosedDelimiter: InternalConflictTranslation<
            (token: NodeLink, expected: NodeLink) => Description
        >;
        UnexpectedEtc: InternalConflictTranslation<Description>;
        UnexpectedInput: ConflictTranslation<
            (evaluation: NodeLink) => Description,
            (input: NodeLink) => Description
        >;
        UnexpectedTypeVariable: InternalConflictTranslation<Description>;
        UnimplementedInterface: InternalConflictTranslation<
            (inter: NodeLink, fun: NodeLink) => Description
        >;
        UnknownBorrow: InternalConflictTranslation<Description>;
        UnknownColumn: InternalConflictTranslation<Description>;
        UnknownConversion: InternalConflictTranslation<
            (from: NodeLink, to: NodeLink) => Description
        >;
        UnknownInput: InternalConflictTranslation<Description>;
        UnknownName: InternalConflictTranslation<
            (name: NodeLink, type: NodeLink | undefined) => Description
        >;
        InvalidTypeName: InternalConflictTranslation<
            (type: ValueLink | NodeLink) => Description
        >;
        Unnamed: InternalConflictTranslation<Description>;
        UnparsableConflict: InternalConflictTranslation<
            (expression: boolean) => Description
        >;
        UnusedBind: InternalConflictTranslation<Description>;
        InputListMustBeLast: InternalConflictTranslation<Description>;
    };
    step: {
        stream: Description;
        jump: Description;
        jumpif: (yes: boolean) => Description;
        halt: Description;
        initialize: Description;
        evaluate: Description;
        next: Description;
        check: Description;
    };
    transform: {
        add: (node: Description) => Description;
        append: (node: Description) => Description;
        remove: (node: Description) => Description;
        replace: (node: Description | undefined) => Description;
    };
    ui: {
        tooltip: {
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
            fullscreen: string;
            collapse: string;
            expand: string;
            close: string;
            language: string;
            horizontal: string;
            vertical: string;
            freeform: string;
            addPhrase: string;
            fit: string;
        };
        labels: {
            learn: string;
            nodoc: string;
        };
        tiles: {
            output: string;
            docs: string;
            palette: string;
        };
    };
    input: {
        random: NameAndDocTranslation & {
            min: NameAndDocTranslation;
            max: NameAndDocTranslation;
        };
        mousebutton: NameAndDocTranslation & { down: NameAndDocTranslation };
        mouseposition: NameAndDocTranslation;
        keyboard: NameAndDocTranslation & {
            key: NameAndDocTranslation;
            down: NameAndDocTranslation;
        };
        time: NameAndDocTranslation & { frequency: NameAndDocTranslation };
        microphone: NameAndDocTranslation & {
            frequency: NameAndDocTranslation;
        };
        reaction: NameAndDocTranslation;
        key: {
            doc: DocTranslation;
            name: DocTranslation;
            key: NameAndDocTranslation;
            down: NameAndDocTranslation;
        };
    };
    output: {
        group: {
            definition: NameAndDocTranslation;
        };
        phrase: {
            definition: NameAndDocTranslation;
            text: NameAndDocTranslation;
            size: NameAndDocTranslation;
            font: NameAndDocTranslation;
            color: NameAndDocTranslation;
            opacity: NameAndDocTranslation;
            place: NameAndDocTranslation;
            offset: NameAndDocTranslation;
            rotation: NameAndDocTranslation;
            scalex: NameAndDocTranslation;
            scaley: NameAndDocTranslation;
            name: NameAndDocTranslation;
            entry: NameAndDocTranslation;
            during: NameAndDocTranslation;
            between: NameAndDocTranslation;
            exit: NameAndDocTranslation;
        };
        pose: {
            definition: NameAndDocTranslation;
            duration: NameAndDocTranslation;
            style: NameAndDocTranslation;
            text: NameAndDocTranslation;
            size: NameAndDocTranslation;
            font: NameAndDocTranslation;
            color: NameAndDocTranslation;
            opacity: NameAndDocTranslation;
            place: NameAndDocTranslation;
            offset: NameAndDocTranslation;
            rotation: NameAndDocTranslation;
            scalex: NameAndDocTranslation;
            scaley: NameAndDocTranslation;
        };
        sequence: {
            definition: NameAndDocTranslation;
            count: NameAndDocTranslation;
            poses: NameAndDocTranslation;
        };
        color: {
            definition: NameAndDocTranslation;
            lightness: NameAndDocTranslation;
            chroma: NameAndDocTranslation;
            hue: NameAndDocTranslation;
        };
        place: {
            definition: NameAndDocTranslation;
            x: NameAndDocTranslation;
            y: NameAndDocTranslation;
            z: NameAndDocTranslation;
        };
        row: {
            definition: NameAndDocTranslation;
            description: Description;
            phrases: NameAndDocTranslation;
        };
        stack: {
            definition: NameAndDocTranslation;
            description: Description;
            phrases: NameAndDocTranslation;
        };
        verse: {
            definition: NameAndDocTranslation;
            description: Description;
            groups: NameAndDocTranslation;
            font: NameAndDocTranslation;
            foreground: NameAndDocTranslation;
            background: NameAndDocTranslation;
            focus: NameAndDocTranslation;
            tilt: NameAndDocTranslation;
        };
        easing: {
            input: NameAndDocTranslation;
            straight: NameAndDocTranslation;
            pokey: NameAndDocTranslation;
            fast: NameAndDocTranslation;
            quick: NameAndDocTranslation;
            zippy: NameAndDocTranslation;
            careful: NameAndDocTranslation;
            cautious: NameAndDocTranslation;
            rushed: NameAndDocTranslation;
            wreckless: NameAndDocTranslation;
            elastic: NameAndDocTranslation;
            erratic: NameAndDocTranslation;
            bouncy: NameAndDocTranslation;
        };
    };
};
export default Translation;
