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

export type LabelTranslator = (node: Node, locale: Locale) => string;

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

export type LessonText<Steps extends number, Names extends number> = {
    tutorial: {
        instructions: FixedArray<Steps, string>;
        text: FixedArray<Names, string>;
    };
};

export type ConceptText<
    Steps extends number,
    Names extends number
> = NameAndDoc & LessonText<Steps, Names>;

export type NodeText<Kind, Steps extends number, Names extends number> = {
    names: string;
    description: Kind;
    doc: DocString;
    emotion: Emotion;
} & LessonText<Steps, Names>;

export type StaticNodeText<
    Steps extends number,
    Names extends number
> = NodeText<string, Steps, Names>;

export type DynamicNodeText<
    NodeType extends Node,
    Steps extends number,
    Names extends number
> = NodeText<
    (
        node: NodeType,
        translation: Locale,
        context: Context
    ) => string | undefined,
    Steps,
    Names
>;

export interface AtomicExpressionText<
    Start extends DescriptionOrGenerator = Description
> {
    start: Start;
}

export interface ExpressionText<
    Start extends DescriptionOrGenerator = Description,
    Finish extends DescriptionOrGenerator = Description
> extends AtomicExpressionText<Start> {
    finish: Finish;
}

export type DescriptionOrGenerator =
    | Description
    | ((...args: any[]) => Description);

export type InternalConflictText<Primary extends DescriptionOrGenerator> = {
    primary: Primary;
};

export type ConflictText<
    Primary extends DescriptionOrGenerator,
    Secondary extends DescriptionOrGenerator
> = InternalConflictText<Primary> & {
    secondary: Secondary;
};

export type FunctionText<Inputs> = {
    name: NameText;
    doc: DocText;
    inputs: Inputs;
};

export type NameText = string | string[];

export type DocText = string;

type ValueOrUndefinedText = (value: ValueLink | undefined) => Description;

export function getFirstName(name: NameText) {
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
    translation: Locale,
    context: Context
) {
    return evaluate
        .getFunction(context)
        ?.names.getLocaleText(translation.language);
}

export function getPlaceholderDescription(
    node: ExpressionPlaceholder,
    translation: Locale,
    context: Context
) {
    return node.type
        ? node.type.getDescription(translation, context)
        : undefined;
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

export function getTokenDescription(token: Token, translation: Locale) {
    return `${getTokenLabel(token, translation)} ${token.getText()}`;
}

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
type Locale = {
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
        BorrowCycle: InternalConflictText<(borrow: NodeLink) => Description>;
        ReferenceCycle: InternalConflictText<(ref: NodeLink) => Description>;
        DisallowedInputs: InternalConflictText<Description>;
        DuplicateName: ConflictText<
            (name: NodeLink) => Description,
            (name: NodeLink) => Description
        >;
        DuplicateShare: ConflictText<
            (bind: NodeLink) => Description,
            (bind: NodeLink) => Description
        >;
        DuplicateTypeVariable: ConflictText<
            (duplicate: NodeLink) => Description,
            (duplicate: NodeLink) => Description
        >;
        ExpectedBooleanCondition: InternalConflictText<
            (type: NodeLink) => Description
        >;
        ExpectedColumnType: InternalConflictText<
            (type: NodeLink) => Description
        >;
        ExpectedEndingExpression: InternalConflictText<Description>;
        ExpectedSelectName: InternalConflictText<
            (cell: NodeLink) => Description
        >;
        ExpectedUpdateBind: InternalConflictText<
            (cell: NodeLink) => Description
        >;
        IgnoredExpression: InternalConflictText<Description>;
        IncompleteImplementation: InternalConflictText<Description>;
        IncompatibleBind: ConflictText<
            (expected: NodeLink) => Description,
            (given: NodeLink, expected: NodeLink) => Description
        >;
        IncompatibleCellType: ConflictText<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        IncompatibleInput: ConflictText<
            (given: NodeLink, expected: NodeLink) => Description,
            (given: NodeLink, expected: NodeLink) => Description
        >;
        IncompatibleKey: ConflictText<
            (expected: NodeLink) => Description,
            (given: NodeLink) => Description
        >;
        ImpossibleType: InternalConflictText<Description>;
        InvalidLanguage: InternalConflictText<Description>;
        InvalidRow: InternalConflictText<Description>;
        InvalidTypeInput: ConflictText<
            (definition: NodeLink) => Description,
            (type: NodeLink) => Description
        >;
        MisplacedConversion: InternalConflictText<Description>;
        MisplacedInput: InternalConflictText<Description>;
        MisplacedShare: InternalConflictText<Description>;
        MisplacedThis: InternalConflictText<Description>;
        MissingCell: ConflictText<
            (column: NodeLink) => Description,
            (row: NodeLink) => Description
        >;
        MissingInput: ConflictText<
            (input: NodeLink) => Description,
            (evaluate: NodeLink) => Description
        >;
        MissingLanguage: InternalConflictText<Description>;
        MissingShareLanguages: InternalConflictText<Description>;
        NoExpression: InternalConflictText<Description>;
        NonBooleanQuery: InternalConflictText<(type: NodeLink) => Description>;
        NotAFunction: InternalConflictText<
            (
                name: NodeLink | undefined,
                given: NodeLink | undefined
            ) => Description
        >;
        NotAList: InternalConflictText<(type: NodeLink) => Description>;
        NotAListIndex: InternalConflictText<(type: NodeLink) => Description>;
        NotAMap: ConflictText<Description, (expr: NodeLink) => Description>;
        NotANumber: InternalConflictText<Description>;
        NotAnInterface: InternalConflictText<Description>;
        NotASetOrMap: InternalConflictText<(type: NodeLink) => Description>;
        NotAStream: InternalConflictText<(type: NodeLink) => Description>;
        NotAStreamIndex: InternalConflictText<(type: NodeLink) => Description>;
        NotATable: InternalConflictText<(type: NodeLink) => Description>;
        NotInstantiable: InternalConflictText<Description>;
        OrderOfOperations: InternalConflictText<Description>;
        Placeholder: InternalConflictText<Description>;
        RequiredAfterOptional: InternalConflictText<Description>;
        UnclosedDelimiter: InternalConflictText<
            (token: NodeLink, expected: NodeLink) => Description
        >;
        UnexpectedEtc: InternalConflictText<Description>;
        UnexpectedInput: ConflictText<
            (evaluation: NodeLink) => Description,
            (input: NodeLink) => Description
        >;
        UnexpectedTypeVariable: InternalConflictText<Description>;
        UnimplementedInterface: InternalConflictText<
            (inter: NodeLink, fun: NodeLink) => Description
        >;
        UnknownBorrow: InternalConflictText<Description>;
        UnknownColumn: InternalConflictText<Description>;
        UnknownConversion: InternalConflictText<
            (from: NodeLink, to: NodeLink) => Description
        >;
        UnknownInput: InternalConflictText<Description>;
        UnknownName: InternalConflictText<
            (name: NodeLink, type: NodeLink | undefined) => Description
        >;
        InvalidTypeName: InternalConflictText<
            (type: ValueLink | NodeLink) => Description
        >;
        Unnamed: InternalConflictText<Description>;
        UnparsableConflict: InternalConflictText<
            (expression: boolean) => Description
        >;
        UnusedBind: InternalConflictText<Description>;
        InputListMustBeLast: InternalConflictText<Description>;
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
            chooserExpand: string;
            place: string;
            paint: string;
            nextLesson: string;
            previousLesson: string;
            nextLessonStep: string;
            previousLessonStep: string;
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
    };
    tutorial: {
        units: UnitNames;
    };
};

export type NodeTexts = {
    Dimension: DynamicNodeText<Dimension, 1, 0>;
    Doc: StaticNodeText<1, 0>;
    Docs: StaticNodeText<1, 0>;
    KeyValue: StaticNodeText<1, 0>;
    Language: DynamicNodeText<Language, 1, 0>;
    Name: DynamicNodeText<Name, 1, 0>;
    Names: DynamicNodeText<Names, 1, 0>;
    Row: StaticNodeText<1, 0>;
    Token: DynamicNodeText<Token, 1, 0>;
    TypeInputs: StaticNodeText<1, 0>;
    TypeVariable: StaticNodeText<1, 0>;
    TypeVariables: StaticNodeText<1, 0>;
    Paragraph: StaticNodeText<1, 0>;
    WebLink: StaticNodeText<1, 0>;
    ConceptLink: StaticNodeText<1, 0>;
    Words: StaticNodeText<1, 0>;
    Example: StaticNodeText<1, 0>;
    BinaryOperation: DynamicNodeText<BinaryOperation, 1, 0> &
        ExpressionText<
            (left: NodeLink) => Description,
            (result: ValueLink | undefined) => Description
        > & {
            right: Description;
        };
    Bind: DynamicNodeText<Bind, 1, 0> &
        ExpressionText<
            (value: NodeLink | undefined) => Description,
            (value: ValueLink | undefined, names: NodeLink) => Description
        >;
    Block: DynamicNodeText<Block, 1, 0> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            statement: Description;
        };
    BooleanLiteral: DynamicNodeText<BooleanLiteral, 1, 0> &
        AtomicExpressionText<(value: NodeLink) => Description>;
    Borrow: StaticNodeText<1, 0> &
        AtomicExpressionText<
            (
                source: NodeLink | undefined,
                name: NodeLink | undefined
            ) => Description
        > & {
            source: Description;
            bind: Description;
            version: Description;
        };
    Changed: StaticNodeText<1, 0> &
        AtomicExpressionText<(stream: NodeLink) => Description> & {
            stream: Description;
        };
    Conditional: StaticNodeText<1, 0> &
        ExpressionText<
            (condition: NodeLink) => Description,
            ValueOrUndefinedText
        > & {
            condition: Description;
            yes: Description;
            no: Description;
        };
    ConversionDefinition: StaticNodeText<1, 0> & AtomicExpressionText;
    Convert: StaticNodeText<1, 0> &
        ExpressionText<(input: NodeLink) => Description, ValueOrUndefinedText>;
    Delete: StaticNodeText<1, 0> &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    DocumentedExpression: StaticNodeText<1, 0> & AtomicExpressionText;
    Evaluate: DynamicNodeText<Evaluate, 1, 0> &
        ExpressionText<
            (inputs: boolean) => Description,
            ValueOrUndefinedText
        > & {
            function: Description;
            input: Description;
        };
    ExpressionPlaceholder: DynamicNodeText<ExpressionPlaceholder, 1, 0> &
        AtomicExpressionText & {
            placeholder: Description;
        };
    FunctionDefinition: DynamicNodeText<FunctionDefinition, 1, 0> &
        AtomicExpressionText;
    HOF: StaticNodeText<1, 0> &
        ExpressionText<Description, ValueOrUndefinedText>;
    Insert: StaticNodeText<1, 0> &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    Initial: StaticNodeText<1, 0>;
    Is: StaticNodeText<1, 0> &
        ExpressionText<
            (expr: NodeLink) => Description,
            (is: boolean, type: NodeLink) => Description
        >;
    ListAccess: StaticNodeText<1, 0> &
        ExpressionText<(list: NodeLink) => Description, ValueOrUndefinedText>;
    ListLiteral: DynamicNodeText<ListLiteral, 1, 0> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            item: Description;
        };
    MapLiteral: DynamicNodeText<MapLiteral, 1, 0> &
        ExpressionText<Description, ValueOrUndefinedText>;
    MeasurementLiteral: DynamicNodeText<MeasurementLiteral, 1, 0> &
        AtomicExpressionText<(value: NodeLink) => Description>;
    NativeExpression: StaticNodeText<1, 0> & AtomicExpressionText;
    NoneLiteral: StaticNodeText<1, 0> & AtomicExpressionText;
    Previous: StaticNodeText<1, 0> &
        ExpressionText<(stream: NodeLink) => Description, ValueOrUndefinedText>;
    Program: StaticNodeText<1, 1> &
        ExpressionText<
            (changes: { stream: ValueLink; value: ValueLink }[]) => Description,
            ValueOrUndefinedText
        >;
    PropertyBind: StaticNodeText<1, 0> &
        ExpressionText<
            Description,
            (structure: ValueLink | undefined) => Description
        >;
    PropertyReference: StaticNodeText<1, 0> &
        ExpressionText<
            Description,
            (
                property: NodeLink | undefined,
                value: ValueLink | undefined
            ) => Description
        > & {
            property: Description;
        };
    Reaction: StaticNodeText<1, 0> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            initial: Description;
            next: Description;
        };
    Reference: DynamicNodeText<Reference, 1, 0> &
        AtomicExpressionText<(name: NodeLink) => Description> & {
            name: Description;
        };
    Select: StaticNodeText<1, 0> &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    SetLiteral: DynamicNodeText<SetLiteral, 1, 0> &
        ExpressionText<Description, ValueOrUndefinedText>;
    SetOrMapAccess: StaticNodeText<1, 0> &
        ExpressionText<(set: NodeLink) => Description, ValueOrUndefinedText>;
    Source: StaticNodeText<1, 0>;
    StreamDefinition: StaticNodeText<1, 0> & AtomicExpressionText;
    StructureDefinition: DynamicNodeText<StructureDefinition, 1, 0> &
        AtomicExpressionText;
    TableLiteral: StaticNodeText<1, 0> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            item: Description;
        };
    Template: StaticNodeText<1, 0> & ExpressionText;
    TextLiteral: DynamicNodeText<TextLiteral, 1, 0> & AtomicExpressionText;
    This: StaticNodeText<1, 0> & AtomicExpressionText<ValueOrUndefinedText>;
    UnaryOperation: DynamicNodeText<UnaryOperation, 1, 0> &
        ExpressionText<(value: NodeLink) => Description, ValueOrUndefinedText>;
    UnparsableExpression: StaticNodeText<1, 0> & AtomicExpressionText;
    Update: StaticNodeText<1, 0> &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    AnyType: StaticNodeText<1, 0>;
    BooleanType: StaticNodeText<1, 0>;
    ConversionType: StaticNodeText<1, 0>;
    ExceptionType: StaticNodeText<1, 0>;
    FunctionDefinitionType: StaticNodeText<1, 0>;
    FunctionType: StaticNodeText<1, 0>;
    ListType: DynamicNodeText<ListType, 1, 0>;
    MapType: DynamicNodeText<MapType, 1, 0>;
    MeasurementType: DynamicNodeText<MeasurementType, 1, 0>;
    NameType: DynamicNodeText<NameType, 1, 0>;
    NeverType: StaticNodeText<1, 0>;
    NoneType: StaticNodeText<1, 0>;
    SetType: DynamicNodeText<SetType, 1, 0>;
    StreamDefinitionType: DynamicNodeText<StreamDefinitionType, 1, 0>;
    StreamType: DynamicNodeText<StreamType, 1, 0>;
    StructureDefinitionType: StaticNodeText<1, 0>;
    TableType: StaticNodeText<1, 0>;
    TextType: DynamicNodeText<TextType, 1, 0>;
    TypePlaceholder: StaticNodeText<1, 0>;
    UnknownType: DynamicNodeText<UnknownType<any>, 1, 0>;
    UnionType: DynamicNodeText<UnionType, 1, 0>;
    UnparsableType: StaticNodeText<1, 0>;
    Unit: DynamicNodeText<Unit, 1, 0>;
    VariableType: StaticNodeText<1, 0>;
    CycleType: DynamicNodeText<CycleType, 1, 0>;
    UnknownVariableType: StaticNodeText<1, 0>;
    NotAListType: StaticNodeText<1, 0>;
    NoExpressionType: StaticNodeText<1, 0>;
    NotAFunctionType: StaticNodeText<1, 0>;
    NotATableType: StaticNodeText<1, 0>;
    NotAStreamType: StaticNodeText<1, 0>;
    NotASetOrMapType: StaticNodeText<1, 0>;
    NotEnclosedType: StaticNodeText<1, 0>;
    NotImplementedType: StaticNodeText<1, 0>;
    UnknownNameType: DynamicNodeText<UnknownNameType, 1, 0>;
};

export type OutputTexts = {
    type: ConceptText<1, 0> & {
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
    group: ConceptText<1, 0> & {
        content: NameAndDoc;
        layout: NameAndDoc;
    };
    phrase: ConceptText<1, 0> & {
        text: NameAndDoc;
    };
    verse: ConceptText<1, 0> & {
        description: (total: number, phrases: number, groups: number) => string;
        content: NameAndDoc;
        background: NameAndDoc;
        frame: NameAndDoc;
    };
    layout: ConceptText<1, 0>;
    shape: ConceptText<1, 0>;
    rectangle: ConceptText<1, 0> & {
        left: NameAndDoc;
        top: NameAndDoc;
        right: NameAndDoc;
        bottom: NameAndDoc;
    };
    pose: ConceptText<1, 0> & {
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
    sequence: ConceptText<1, 0> & {
        count: NameAndDoc;
        timing: NameAndDoc;
        poses: NameAndDoc;
    };
    color: ConceptText<1, 0> & {
        lightness: NameAndDoc;
        chroma: NameAndDoc;
        hue: NameAndDoc;
    };
    place: ConceptText<1, 0> & {
        x: NameAndDoc;
        y: NameAndDoc;
        z: NameAndDoc;
    };
    row: ConceptText<1, 0> & {
        description: (total: number, phrases: number, groups: number) => string;
        padding: NameAndDoc;
    };
    stack: ConceptText<1, 0> & {
        description: (total: number, phrases: number, groups: number) => string;
        padding: NameAndDoc;
    };
    grid: ConceptText<1, 0> & {
        description: (rows: number, columns: number) => string;
        rows: NameAndDoc;
        columns: NameAndDoc;
        padding: NameAndDoc;
        cellWidth: NameAndDoc;
        cellHeight: NameAndDoc;
    };
    free: ConceptText<1, 0> & {
        description: (count: number) => string;
    };
    easing: {
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
    random: ConceptText<1, 0> & {
        min: NameAndDoc;
        max: NameAndDoc;
    };
    choice: ConceptText<1, 0>;
    button: ConceptText<1, 0> & { down: NameAndDoc };
    pointer: ConceptText<1, 0>;
    key: ConceptText<1, 0> & {
        key: NameAndDoc;
        down: NameAndDoc;
    };
    time: ConceptText<1, 0> & { frequency: NameAndDoc };
    mic: ConceptText<1, 0> & {
        frequency: NameAndDoc;
    };
    camera: ConceptText<1, 0> & {
        width: NameAndDoc;
        height: NameAndDoc;
        frequency: NameAndDoc;
    };
    reaction: ConceptText<1, 0>;
    motion: ConceptText<1, 0> & {
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
    overview: string;
};

export type UnitNames = {
    welcome: UnitText;
    numbers: UnitText;
};

export default Locale;
