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

export type ConceptText<
    Steps extends number,
    Names extends number
> = NameAndDoc;

export type NodeText<Kind> = {
    /* The name that should be used to refer to the node type */
    name: string;
    /* A description of what the node is */
    description: Kind;
    /* Documentation text that appears in the documentation view */
    doc: DocString;
    /* The emotion that should be conveyed in animations of the node type */
    emotion: Emotion;
};

export type StaticNodeText = NodeText<string>;

export type DynamicNodeText<NodeType extends Node> = NodeText<
    (
        node: NodeType,
        translation: Locale,
        context: Context
    ) => string | undefined
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
        ExpectedBooleanCondition: ConflictText<
            (type: NodeLink) => Description,
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
        IgnoredExpression: ConflictText<Description, Description>;
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
    tutorial: Tutorial;
};

export type NodeTexts = {
    Dimension: DynamicNodeText<Dimension>;
    Doc: StaticNodeText;
    Docs: StaticNodeText;
    KeyValue: StaticNodeText;
    Language: DynamicNodeText<Language>;
    Name: DynamicNodeText<Name>;
    Names: DynamicNodeText<Names>;
    Row: StaticNodeText;
    Token: DynamicNodeText<Token>;
    TypeInputs: StaticNodeText;
    TypeVariable: StaticNodeText;
    TypeVariables: StaticNodeText;
    Paragraph: StaticNodeText;
    WebLink: StaticNodeText;
    ConceptLink: StaticNodeText;
    Words: StaticNodeText;
    Example: StaticNodeText;
    BinaryOperation: DynamicNodeText<BinaryOperation> &
        ExpressionText<
            (left: NodeLink) => Description,
            (result: ValueLink | undefined) => Description
        > & {
            right: Description;
        };
    Bind: DynamicNodeText<Bind> &
        ExpressionText<
            (value: NodeLink | undefined) => Description,
            (value: ValueLink | undefined, names: NodeLink) => Description
        >;
    Block: DynamicNodeText<Block> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            statement: Description;
        };
    BooleanLiteral: DynamicNodeText<BooleanLiteral> &
        AtomicExpressionText<(value: NodeLink) => Description>;
    Borrow: StaticNodeText &
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
    Changed: StaticNodeText &
        AtomicExpressionText<(stream: NodeLink) => Description> & {
            stream: Description;
        };
    Conditional: StaticNodeText &
        ExpressionText<
            (condition: NodeLink) => Description,
            ValueOrUndefinedText
        > & {
            condition: Description;
            yes: Description;
            no: Description;
        };
    ConversionDefinition: StaticNodeText & AtomicExpressionText;
    Convert: StaticNodeText &
        ExpressionText<(input: NodeLink) => Description, ValueOrUndefinedText>;
    Delete: StaticNodeText &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    DocumentedExpression: StaticNodeText & AtomicExpressionText;
    Evaluate: DynamicNodeText<Evaluate> &
        ExpressionText<
            (inputs: boolean) => Description,
            ValueOrUndefinedText
        > & {
            function: Description;
            input: Description;
        };
    ExpressionPlaceholder: DynamicNodeText<ExpressionPlaceholder> &
        AtomicExpressionText & {
            placeholder: Description;
        };
    FunctionDefinition: DynamicNodeText<FunctionDefinition> &
        AtomicExpressionText;
    HOF: StaticNodeText & ExpressionText<Description, ValueOrUndefinedText>;
    Insert: StaticNodeText &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    Initial: StaticNodeText;
    Is: StaticNodeText &
        ExpressionText<
            (expr: NodeLink) => Description,
            (is: boolean, type: NodeLink) => Description
        >;
    ListAccess: StaticNodeText &
        ExpressionText<(list: NodeLink) => Description, ValueOrUndefinedText>;
    ListLiteral: DynamicNodeText<ListLiteral> &
        ExpressionText<Description, ValueOrUndefinedText> & {
            item: Description;
        };
    MapLiteral: DynamicNodeText<MapLiteral> &
        ExpressionText<Description, ValueOrUndefinedText>;
    MeasurementLiteral: DynamicNodeText<MeasurementLiteral> &
        AtomicExpressionText<(value: NodeLink) => Description>;
    NativeExpression: StaticNodeText & AtomicExpressionText;
    NoneLiteral: StaticNodeText & AtomicExpressionText;
    Previous: StaticNodeText &
        ExpressionText<(stream: NodeLink) => Description, ValueOrUndefinedText>;
    Program: StaticNodeText &
        ExpressionText<
            (changes: { stream: ValueLink; value: ValueLink }[]) => Description,
            ValueOrUndefinedText
        >;
    PropertyBind: StaticNodeText &
        ExpressionText<
            Description,
            (structure: ValueLink | undefined) => Description
        >;
    PropertyReference: StaticNodeText &
        ExpressionText<
            Description,
            (
                property: NodeLink | undefined,
                value: ValueLink | undefined
            ) => Description
        > & {
            property: Description;
        };
    Reaction: StaticNodeText &
        ExpressionText<Description, ValueOrUndefinedText> & {
            initial: Description;
            next: Description;
        };
    Reference: DynamicNodeText<Reference> &
        AtomicExpressionText<(name: NodeLink) => Description> & {
            name: Description;
        };
    Select: StaticNodeText &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    SetLiteral: DynamicNodeText<SetLiteral> &
        ExpressionText<Description, ValueOrUndefinedText>;
    SetOrMapAccess: StaticNodeText &
        ExpressionText<(set: NodeLink) => Description, ValueOrUndefinedText>;
    Source: StaticNodeText;
    StreamDefinition: StaticNodeText & AtomicExpressionText;
    StructureDefinition: DynamicNodeText<StructureDefinition> &
        AtomicExpressionText;
    TableLiteral: StaticNodeText &
        ExpressionText<Description, ValueOrUndefinedText> & {
            item: Description;
        };
    Template: StaticNodeText & ExpressionText;
    TextLiteral: DynamicNodeText<TextLiteral> & AtomicExpressionText;
    This: StaticNodeText & AtomicExpressionText<ValueOrUndefinedText>;
    UnaryOperation: DynamicNodeText<UnaryOperation> &
        ExpressionText<(value: NodeLink) => Description, ValueOrUndefinedText>;
    UnparsableExpression: StaticNodeText & AtomicExpressionText;
    Update: StaticNodeText &
        ExpressionText<(table: NodeLink) => Description, ValueOrUndefinedText>;
    AnyType: StaticNodeText;
    BooleanType: StaticNodeText;
    ConversionType: StaticNodeText;
    ExceptionType: StaticNodeText;
    FunctionDefinitionType: StaticNodeText;
    FunctionType: StaticNodeText;
    ListType: DynamicNodeText<ListType>;
    MapType: DynamicNodeText<MapType>;
    MeasurementType: DynamicNodeText<MeasurementType>;
    NameType: DynamicNodeText<NameType>;
    NeverType: StaticNodeText;
    NoneType: StaticNodeText;
    SetType: DynamicNodeText<SetType>;
    StreamDefinitionType: DynamicNodeText<StreamDefinitionType>;
    StreamType: DynamicNodeText<StreamType>;
    StructureDefinitionType: StaticNodeText;
    TableType: StaticNodeText;
    TextType: DynamicNodeText<TextType>;
    TypePlaceholder: StaticNodeText;
    UnknownType: DynamicNodeText<UnknownType<any>>;
    UnionType: DynamicNodeText<UnionType>;
    UnparsableType: StaticNodeText;
    Unit: DynamicNodeText<Unit>;
    VariableType: StaticNodeText;
    CycleType: DynamicNodeText<CycleType>;
    UnknownVariableType: StaticNodeText;
    NotAListType: StaticNodeText;
    NoExpressionType: StaticNodeText;
    NotAFunctionType: StaticNodeText;
    NotATableType: StaticNodeText;
    NotAStreamType: StaticNodeText;
    NotASetOrMapType: StaticNodeText;
    NotEnclosedType: StaticNodeText;
    NotImplementedType: StaticNodeText;
    UnknownNameType: DynamicNodeText<UnknownNameType>;
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
        description: (total: number, phrases: number, groups: number) => string;
        content: NameAndDoc;
        background: NameAndDoc;
        frame: NameAndDoc;
    };
    Layout: ConceptText<1, 0>;
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
        description: (total: number, phrases: number, groups: number) => string;
        padding: NameAndDoc;
    };
    Stack: ConceptText<1, 0> & {
        description: (total: number, phrases: number, groups: number) => string;
        padding: NameAndDoc;
    };
    Grid: ConceptText<1, 0> & {
        description: (rows: number, columns: number) => string;
        rows: NameAndDoc;
        columns: NameAndDoc;
        padding: NameAndDoc;
        cellWidth: NameAndDoc;
        cellHeight: NameAndDoc;
    };
    Free: ConceptText<1, 0> & {
        description: (count: number) => string;
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

export function code(source: string, fit: boolean, edit: boolean): Code {
    return {
        sources: [source],
        fit,
        edit,
    };
}

export function output(source: string, fit: boolean = true): Code {
    return {
        sources: [source],
        fit,
        edit: false,
    };
}

export function edit(source: string): Code {
    return code(source, true, true);
}

export function pause() {
    return null;
}

export default Locale;
