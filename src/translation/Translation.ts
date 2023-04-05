import type LanguageCode from './LanguageCode';
import Token from '@nodes/Token';
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
import type BooleanLiteral from '@nodes/BooleanLiteral';
import type ListLiteral from '@nodes/ListLiteral';
import type StreamDefinitionType from '../nodes/StreamDefinitionType';
import type Emotion from '../lore/Emotion';
import type TextType from '../nodes/TextType';
import type Name from '../nodes/Name';
import type Language from '../nodes/Language';
import { Languages } from './LanguageCode';
import type Names from '../nodes/Names';
import type BinaryOperation from '../nodes/BinaryOperation';
import type Bind from '../nodes/Bind';
import type Block from '../nodes/Block';
import type Evaluate from '../nodes/Evaluate';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type MapLiteral from '../nodes/MapLiteral';
import type SetLiteral from '../nodes/SetLiteral';
import type TextLiteral from '../nodes/TextLiteral';
import type UnaryOperation from '../nodes/UnaryOperation';
import TokenType from '../nodes/TokenType';
import type StructureDefinition from '../nodes/StructureDefinition';

export type Description = string | Explanation;
export type DocString = string;

type LabelTranslator = (node: Node, translation: Translation) => string;

export interface NodeTranslation<Kind> {
    label: string | LabelTranslator;
    description: Kind;
    doc: DocString;
    emotion: Emotion;
}

export type StaticNodeTranslation = NodeTranslation<string>;

export type DynamicNodeTranslation<NodeType extends Node> = NodeTranslation<
    (
        node: NodeType,
        translation: Translation,
        context: Context
    ) => string | undefined
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

export function getFirstName(name: NameTranslation) {
    return typeof name === 'string' ? name : name[0];
}

export function getDimensionDescription(dimension: Dimension) {
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
}

export function getLanguageDescription(language: Language) {
    return language.lang
        ? Languages[language.lang.getText()]?.name ?? undefined
        : undefined;
}

export function getEvaluateDescription(
    evaluate: Evaluate,
    translation: Translation,
    context: Context
) {
    return evaluate
        .getFunction(context)
        ?.names.getTranslation(translation.language);
}

export function getPlaceholderDescription(
    node: ExpressionPlaceholder,
    translation: Translation,
    context: Context
) {
    return node.type
        ? node.type.getDescription(translation, context)
        : undefined;
}

export function getTokenLabel(token: Node, translation: Translation): string {
    if (!(token instanceof Token)) return token.getLabel(translation);

    const tokenType = Object.entries(TokenType).find(
        ([, val]) => val === token.types[0]
    );
    const tokenLabel = tokenType
        ? translation.token[tokenType[0] as keyof typeof TokenType]
        : '';
    return tokenLabel;
}

export function getTokenDescription(token: Token, translation: Translation) {
    return `${getTokenLabel(token, translation)} ${token.getText()}`;
}

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
type Translation = {
    language: LanguageCode;
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
    };
    /** A way to say "before [description]" */
    caret: {
        before: (description: string) => string;
        inside: (description: string) => string;
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
    token: Record<keyof typeof TokenType, string>;
    node: {
        Dimension: DynamicNodeTranslation<Dimension>;
        Doc: StaticNodeTranslation;
        Docs: StaticNodeTranslation;
        KeyValue: StaticNodeTranslation;
        Language: DynamicNodeTranslation<Language>;
        Name: DynamicNodeTranslation<Name>;
        Names: DynamicNodeTranslation<Names>;
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
        BinaryOperation: DynamicNodeTranslation<BinaryOperation> &
            ExpressionTranslation<
                (left: NodeLink) => Description,
                (result: ValueLink | undefined) => Description
            > & {
                right: Description;
            };
        Bind: DynamicNodeTranslation<Bind> &
            ExpressionTranslation<
                (value: NodeLink | undefined) => Description,
                (value: ValueLink | undefined, names: NodeLink) => Description
            >;
        Block: DynamicNodeTranslation<Block> &
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
        Evaluate: DynamicNodeTranslation<Evaluate> &
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
        FunctionDefinition: DynamicNodeTranslation<FunctionDefinition> &
            AtomicExpressionTranslation;
        HOF: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation>;
        Insert: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Initial: StaticNodeTranslation;
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
        MapLiteral: DynamicNodeTranslation<MapLiteral> &
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
                    changes: { stream: ValueLink; value: ValueLink }[]
                ) => Description,
                ValueOrUndefinedTranslation
            >;
        PropertyBind: StaticNodeTranslation &
            ExpressionTranslation<
                Description,
                (structure: ValueLink | undefined) => Description
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
            AtomicExpressionTranslation<(name: NodeLink) => Description> & {
                name: Description;
            };
        Select: StaticNodeTranslation &
            ExpressionTranslation<
                (table: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        SetLiteral: DynamicNodeTranslation<SetLiteral> &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation>;
        SetOrMapAccess: StaticNodeTranslation &
            ExpressionTranslation<
                (set: NodeLink) => Description,
                ValueOrUndefinedTranslation
            >;
        Source: StaticNodeTranslation;
        StreamDefinition: StaticNodeTranslation & AtomicExpressionTranslation;
        StructureDefinition: DynamicNodeTranslation<StructureDefinition> &
            AtomicExpressionTranslation;
        TableLiteral: StaticNodeTranslation &
            ExpressionTranslation<Description, ValueOrUndefinedTranslation> & {
                item: Description;
            };
        Template: StaticNodeTranslation & ExpressionTranslation;
        TextLiteral: DynamicNodeTranslation<TextLiteral> &
            AtomicExpressionTranslation;
        This: StaticNodeTranslation &
            AtomicExpressionTranslation<ValueOrUndefinedTranslation>;
        UnaryOperation: DynamicNodeTranslation<UnaryOperation> &
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
        TextType: DynamicNodeTranslation<TextType>;
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
                repeat: FunctionTranslation<[NameAndDocTranslation]>;
                segment: FunctionTranslation<[NameAndDocTranslation]>;
                combine: FunctionTranslation<[NameAndDocTranslation]>;
                has: FunctionTranslation<[NameAndDocTranslation]>;
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
                truncate: FunctionTranslation<[NameAndDocTranslation]>;
                absolute: FunctionTranslation<[NameAndDocTranslation]>;
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
                append: FunctionTranslation<[NameAndDocTranslation]>;
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
                    index: NameAndDocTranslation;
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
                    index: NameAndDocTranslation;
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
        blank: () => Description;
        function: (name: NodeLink, type: NodeLink | undefined) => Description;
        cycle: (borrow: NodeLink) => Description;
        functionlimit: (fun: NodeLink) => Description;
        steplimit: Description;
        name: (
            name: NodeLink | undefined,
            scope: ValueLink | undefined
        ) => Description;
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
            (given: NodeLink, expected: NodeLink) => Description
        >;
        IncompatibleCellType: ConflictTranslation<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        IncompatibleInput: ConflictTranslation<
            (given: NodeLink, expected: NodeLink) => Description,
            (given: NodeLink, expected: NodeLink) => Description
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
    input: {
        random: NameAndDocTranslation & {
            min: NameAndDocTranslation;
            max: NameAndDocTranslation;
        };
        choice: NameAndDocTranslation;
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
        camera: NameAndDocTranslation & {
            width: NameAndDocTranslation;
            height: NameAndDocTranslation;
            frequency: NameAndDocTranslation;
        };
        reaction: NameAndDocTranslation;
        motion: NameAndDocTranslation & {
            type: NameAndDocTranslation;
            vx: NameAndDocTranslation;
            vy: NameAndDocTranslation;
            vz: NameAndDocTranslation;
            vangle: NameAndDocTranslation;
            mass: NameAndDocTranslation;
            gravity: NameAndDocTranslation;
            bounciness: NameAndDocTranslation;
        };
    };
    output: {
        type: {
            definition: NameAndDocTranslation;
            size: NameAndDocTranslation;
            family: NameAndDocTranslation;
            place: NameAndDocTranslation;
            rotation: NameAndDocTranslation;
            name: NameAndDocTranslation;
            selectable: NameAndDocTranslation;
            enter: NameAndDocTranslation;
            rest: NameAndDocTranslation;
            move: NameAndDocTranslation;
            exit: NameAndDocTranslation;
            duration: NameAndDocTranslation;
            style: NameAndDocTranslation;
        };
        group: {
            definition: NameAndDocTranslation;
            content: NameAndDocTranslation;
            layout: NameAndDocTranslation;
        };
        phrase: {
            definition: NameAndDocTranslation;
            text: NameAndDocTranslation;
        };
        verse: {
            definition: NameAndDocTranslation;
            description: (
                total: number,
                phrases: number,
                groups: number
            ) => string;
            content: NameAndDocTranslation;
            background: NameAndDocTranslation;
        };
        layout: {
            definition: NameAndDocTranslation;
        };
        pose: {
            definition: NameAndDocTranslation;
            duration: NameAndDocTranslation;
            style: NameAndDocTranslation;
            color: NameAndDocTranslation;
            opacity: NameAndDocTranslation;
            offset: NameAndDocTranslation;
            tilt: NameAndDocTranslation;
            scale: NameAndDocTranslation;
            flipx: NameAndDocTranslation;
            flipy: NameAndDocTranslation;
        };
        sequence: {
            definition: NameAndDocTranslation;
            count: NameAndDocTranslation;
            timing: NameAndDocTranslation;
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
            description: (
                total: number,
                phrases: number,
                groups: number
            ) => string;
            padding: NameAndDocTranslation;
        };
        stack: {
            definition: NameAndDocTranslation;
            description: (
                total: number,
                phrases: number,
                groups: number
            ) => string;
            padding: NameAndDocTranslation;
        };
        grid: {
            definition: NameAndDocTranslation;
            description: (rows: number, columns: number) => string;
            rows: NameAndDocTranslation;
            columns: NameAndDocTranslation;
            padding: NameAndDocTranslation;
        };
        easing: {
            // CSS linear
            straight: NameTranslation;
            // CSS ease-in
            pokey: NameTranslation;
            // CSS ease-in-out
            cautious: NameTranslation;
            // CSS ease-out
            zippy: NameTranslation;
        };
    };
    animation: {
        sway: NameAndDocTranslation & { angle: NameAndDocTranslation };
        bounce: NameAndDocTranslation & { height: NameAndDocTranslation };
        spin: NameAndDocTranslation;
    };
};
export default Translation;
