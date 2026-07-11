import type { Emotion } from '../lore/Emotion';
import type { DocText, FormattedText, Template } from '@locale/LocaleText';

export type NodeText = {
    /** [plain] The display name that should be used to refer to the node type; a label, not a Wordplay identifier, so spaces are fine */
    name: string;
    /** [formatted] Documentation text that appears in the documentation view */
    doc: DocText;
    /** [emotion] The emotion that should be conveyed in animations of the node type */
    emotion: `${Emotion}`;
};

export type DescriptiveNodeText<DescNames extends readonly string[] = []> =
    NodeText & {
        /** [formatted] A precise description of the node's contents, more specific than a name. If not provided, name is used. */
        description: Template<DescNames>;
    };

export interface SimpleExpressionText<
    StartNames extends readonly string[] = [],
> {
    /** [formatted] The text shown when this expression type first begins evaluating.  */
    start: Template<StartNames>;
}

export interface ExpressionText<
    StartNames extends readonly string[] = [],
    FinishNames extends readonly string[] = [],
> extends SimpleExpressionText<StartNames> {
    /** [formatted] The text shown when this expression type finishes evaluating and has a value. */
    finish: Template<FinishNames>;
}

export interface Conflicts<T> {
    /** Conflicts that this node can generate */
    conflict: T;
}

/** The text that describes this conflict type. */
export type ConflictText<Names extends readonly string[] = []> = {
    /** [plain] The short header to describe the conflict; a label, not a Wordplay identifier, so spaces are fine */
    name: string;
    /** [formatted] The text that describes this conflict on the node which generated it. */
    explanation: Template<Names>;
};

/**
 * Resolution templates for type-mismatch conflicts. Each of the five
 * type-mismatch conflicts ({@link IncompatibleType}, {@link IncompatibleInput},
 * {@link IncompatibleKey}, {@link IncompatibleCellType}, {@link ExpectedBooleanCondition})
 * extends its locale shape with this bundle. The generators in
 * `src/conflicts/TypeResolutions.ts` look up these keys when constructing
 * the user-facing description for each suggested edit.
 */
export type TypeResolutionTemplates = {
    /** [formatted] Suggested fix that converts the value to the expected type */
    resolution: Template<['expected']>;
    /** [formatted] Suggested fix that marks a list/set/map as literal so its values stay specific */
    resolutionLiteral: Template<['expected']>;
    /** [formatted] Suggested fix that uses `??` to handle a none value */
    resolutionOtherwise: Template<['expected']>;
    /** [formatted] Suggested fix that uses a type guard to narrow a union */
    resolutionGuard: Template<['expected']>;
    /** [formatted] Suggested fix that adds an explicit type declaration */
    resolutionDeclaration: Template<['expected']>;
    /** [formatted] Suggested fix that wraps the value in a list/set/map literal */
    resolutionWrap: Template<['expected']>;
    /** [formatted] Suggested fix that wraps the value in a Structure constructor call */
    resolutionStructure: Template<['expected']>;
    /** [formatted] Suggested fix that adds a default value to a Bind */
    resolutionDefault: Template<['expected']>;
    /** [formatted] Suggested fix that widens a Bind's declared type to include the given */
    resolutionWiden: Template<['expected']>;
    /** [formatted] Suggested fix that swaps two arguments in an Evaluate */
    resolutionReorder: Template<['expected']>;
    /** [formatted] Suggested fix that replaces the value with a placeholder so the autocomplete menu can take over */
    resolutionPlaceholder: Template<['expected']>;
};

/**
 * Extends a type-mismatch conflict with a dedicated explanation used when the
 * offending none value comes from a `÷` or `%` that could divide by zero. Used
 * by {@link IncompatibleInput} and {@link IncompatibleType}.
 */
export type DivideByZeroConflictText = {
    /** [formatted] Explanation shown when the incompatible none value comes from a `÷`/`%` that could divide by zero. */
    explanationDivideByZero: Template<['source']>;
};

export interface Exceptions<Kinds> {
    /** The set of exception values that this node can evaluate to. */
    exception: Kinds;
}

export interface ExceptionText<
    DescNames extends readonly string[] = [],
    ExplNames extends readonly string[] = [],
> {
    /** [formatted] A description of the kind of exception this is; appears as screen reader text and a header when exception value is displayed on stage. */
    description: Template<DescNames>;
    /** [formatted] The text of the explanation, in the voice of the node that generated it. Appears when value is shown on stage. */
    explanation: Template<ExplNames>;
}

type NodeTexts = {
    /** A part of a number's unit, such as the `m` in `1m`, or the `s` in `1m/s^2` */
    Dimension: DescriptiveNodeText;
    /** A single language tagged documentation text, ` ¶I am documentation¶/en` */
    Doc: DescriptiveNodeText;
    /** Multiple language tagged documentation texts, ` ¶Hi docs¶/en¶Hola docs¶/es`  */
    Docs: DescriptiveNodeText & SimpleExpressionText;
    /** A key value pair in a map, such as `a: 1` in `{ a: 1 b: 2}`  */
    KeyValue: DescriptiveNodeText;
    /** A language tag appearing in a doc or name, such as `/en` in `name/en: 1` or ` ¶My doc¶/en` */
    Language: DescriptiveNodeText &
        Conflicts<{
            UnknownLanguage: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            MissingLanguage: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            DuplicateLanguage: ConflictText<['code']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['code']>;
            };
        }>;
    /**
     * A name, e.g., `hi`.
     * Description inputs: $1 = name or undefined
     */
    Name: DescriptiveNodeText<['name']>;
    /** A list of names, e.g., `hi,hello,hey` */
    Names: DescriptiveNodeText & {
        label: {
            /** [plain] The placeholder label for the list of names */
            names: string;
        };
    };
    /** A row in a table, e.g., `⎡1 2⎦` */
    Row: DescriptiveNodeText &
        Conflicts<{
            /** When a row does not form to it's table's type definition */
            InvalidRow: ConflictText & {
                /** [formatted] Action: drop the named cells from the row, keep positional */
                resolutionKeepPositional: Template<[]>;
                /** [formatted] Action: drop the names from the named cells, making them positional */
                resolutionUnwrapInputs: Template<[]>;
            };
            /**
             * When cell is missing from a row. $1: Column
             * $2: Row
             * */
            MissingCell: ConflictText<['column']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['column']>;
            };
            /**
             * When an extra cell was provided.
             * $1: Cell */
            ExtraCell: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When a unknown column is specified by name.
             */
            UnknownColumn: ConflictText & {
                /** [formatted] Action: rename to the suggested column name */
                resolution: Template<['name']>;
            };
            /** When a bind was not expected in a row but it was provided. */
            UnexpectedColumnBind: ConflictText;
        }>;
    /**
     * Any token in a Wordplay program.
     * Description inputs: $1 = token label, $2 = token text
     */
    Token: DescriptiveNodeText<['label']>;
    /** A list of type inputs to something that takes type variables, e.g., `⸨# #⸩` in `myfun⸨# #⸩(b c)` */
    TypeInputs: DescriptiveNodeText;
    /** A type variable in function or structure definition, `T` in `ƒ⸨T⸩(a: T)` */
    TypeVariable: DescriptiveNodeText &
        Conflicts<{
            /** When a type variable name is the same as another. $1: The duplicate name */
            DuplicateTypeVariable: ConflictText<['duplicate']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }> & {
            label: {
                /** [plain] The placeholder label for the type variable's name */
                type: string;
            };
        };
    /** A list of type variables in a function or structure definition, e.g. `⸨T⸩` in `ƒ⸨T⸩(a: T b: T)` */
    TypeVariables: DescriptiveNodeText;
    /**
     * Markup text used in documentation or phrase text, e.g., ` ¶Hello, I am *bold*¶ `
     * Description inputs: $1 = paragraph count
     */
    Markup: DescriptiveNodeText<['count']> & {
        label: {
            /** [plain] The placeholder label for the list of paragraphs */
            paragraphs: string;
        };
    };
    /**
     * A paragraph of text in `Markup`, e.g.,  `Paragraph 1` in ` ¶Paragraph 1\n\nParagraph 2¶ `
     * Description inputs: $1 = number, $2 = unit
     */
    Paragraph: DescriptiveNodeText;
    /**
     * A link in `Markup`, e.g., ` ¶<wordplay@https://wordplay.div>¶ `
     * Description inputs: $1 = the url
     */
    WebLink: DescriptiveNodeText<['url']>;
    /**
     * A link in `Markup` or plain text, e.g., ` ¶Check out @WebLink¶ `. The base
     * `description` covers a documented concept; `kind` holds the description for
     * each other thing a reference can resolve to. Description input: $concept.
     */
    ConceptLink: DescriptiveNodeText<['concept']> & {
        /** Per-reference-kind descriptions, chosen by what the @ reference resolves to. */
        kind: {
            /** [formatted] Description when the reference is a Unicode codepoint (e.g. @U/1F600). */
            codepoint: Template<['concept']>;
            /** [formatted] Description when the reference is a UI element (e.g. @UI/toolbar). */
            ui: Template<['concept']>;
            /** [formatted] Description when the reference is a how-to (e.g. @How/...). */
            how: Template<['concept']>;
            /** [formatted] Description when the reference is a creator's custom character (e.g. @amy/cat). */
            character: Template<['concept']>;
        };
    };
    /** A sequence of characters in `Markup` that aren't other markup content, e.g., ` ¶These are just words.¶ ` */
    Words: DescriptiveNodeText &
        Conflicts<{
            /**
             * When a @Phrase requests a weight or italic style its face doesn't ship.
             * $1 = face name, $2 = missing format name (e.g. "extra bold", "italic")
             */
            UnsupportedFontFormat: ConflictText<['face', 'format']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /** Code inside `Markup`, e.g., ` ¶This is how you add: \1 + 1\¶ ` */
    Example: DescriptiveNodeText;
    /** Foreign-language code inside `Markup`, e.g., ` ¶In Python: \py| a = 5\¶ ` */
    ExternalExample: DescriptiveNodeText;
    /**
     * A placeholder for some template input or terminology name in a localization string, e.g., the `$1` in  ` ¶My value is $1¶ or `$bind` in ` ¶I am a $bind¶ `
     * Description inputs: $1 = the name or number mentioned
     */
    Mention: DescriptiveNodeText<['name']>;
    /**
     * A branch in `Markup` that renders different text depending on an input, e.g., ` ¶$1[I am $1|I am nothing]¶ `
     */
    Branch: DescriptiveNodeText;
    /**
     * An infix formatted binary operation, e.g., `1 + 1` or `2 ÷ 3`
     * Description inputs: $1 = the operator
     * Start inputs: $1 = left expression
     * Finish inputs: $1 = resulting value
     */
    BinaryEvaluate: DescriptiveNodeText<['operator']> &
        ExpressionText<['left'], ['value']> & {
            /** [formatted] How to describe the right operand in a placeholder expression */
            right: FormattedText;
        } & Conflicts<{
            /** Warning about order of evaluation of binary evaluations always being reading order, not math order of operations */
            OrderOfOperations: ConflictText & {
                /** [formatted] Action: rotate the tree to evaluate the higher-precedence operator first (PEMDAS) */
                resolutionPEMDAS: Template<['higher', 'lower']>;
                /** [formatted] Action: parenthesize the left subtree to keep the existing left-to-right reading order */
                resolutionReading: Template<['higher', 'lower']>;
                /** [formatted] Action: same-precedence case — just add parentheses to make the order explicit */
                resolutionWrap: Template<[]>;
            };
        }> & {
            label: {
                /** [plain] The placeholder label for the operator */
                operator: string;
            };
        };
    /**
     * Naming a value, e.g., `mybinding: 5m`
     * Description inputs: $1 = the name that is bound
     * Start inputs: $1 = the bind name being evaluated
     * Finish inputs: $1 = the value producd, $2: the names bound
     */
    Bind: DescriptiveNodeText<['name']> &
        ExpressionText<['value'], ['value', 'name']> & {
            label: {
                /** [plain] The placeholder label for the bound value expression */
                value: string;
                /** [plain] The placeholder label for the names */
                names: string;
                /** [plain] The placeholder label for the type annotation */
                type: string;
            };
        } & Conflicts<{
            /** When a bind has duplicate names. */
            DuplicateName: {
                conflict: ConflictText<['shadowed']>;
                /** [formatted] Suggested fix when names conflict */
                resolution: FormattedText;
            };
            /** When a name is spelled like a localized keyword that wins over a name (advisory). */
            ShadowsKeyword: ConflictText<['keyword']>;
            /** When a shared bind has a duplicate name that's shared. */
            DuplicateShare: ConflictText<['duplicate']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a bind and it's value type are incompatible. */
            IncompatibleType: ConflictText<['expected', 'given']> &
                TypeResolutionTemplates &
                DivideByZeroConflictText;
            /**
             * When a bind is marked as share, but not at the top level.
             */
            MisplacedShare: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a bind is shared, but not language tagged. */
            MissingShareLanguages: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a bind is required, but appears after an optional bind in a definition */
            RequiredAfterOptional: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a bind is marked as a variable length list, but not at the end. */
            UnexpectedEtc: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a bind is declared but never used. */
            UnusedBind: ConflictText<['name']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A block of expressions, evaluating to the final expression's value, e.g., `(a: 1  1 + a)`
     * Description inputs: $1: # of statements
     * Start inputs: none
     * Finish inputs: $1 = Resulting value
     */
    Block: DescriptiveNodeText<['count']> &
        ExpressionText<[], ['value']> & {
            label: {
                /** [plain] The placeholder label for a statement in the block */
                statements: string;
            };
        } & Conflicts<{
            /** When there's no non-Bind expression to produce a value */
            ExpectedEndingExpression: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A single boolean literal, e.g., `⊤` or `⊥`
     * Description inputs: $1: true if true, false otherwise
     */
    BooleanLiteral: DescriptiveNodeText<['value']> &
        SimpleExpressionText<['value']>;
    /**
     * A borrow staement, indicating some code to import into a source
     * Start inputs: $1 = source name, $2: name borrowed
     */
    Borrow: DescriptiveNodeText<['name']> &
        SimpleExpressionText<['source', 'name']> & {
            label: {
                /** [plain] Placeholder label for the source name */
                source: string;
                /** [plain] Placeholder label for the bind name being borrowed */
                bind: string;
                /** [plain] Placeholder label for the version being borrowed */
                version: string;
            };
        } & Conflicts<{
            /** When the borrowed name could not be found */
            UnknownBorrow: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a borrowed value depends on the source file doing the borrowing. */
            BorrowCycle: ConflictText<['borrow']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }> &
        Exceptions<{
            /** When a borrow depends on itself. Description inputs: $1: Borrow that it depends on */
            CycleException: ExceptionText<[], ['borrow']>;
        }>;

    /**
     * A change predicate expression, true if the stream changed, causing this reevaluation, e.g., `∆ Key()`
     * Start inputs: $1 = stream that changed
     */
    Changed: DescriptiveNodeText &
        SimpleExpressionText<['stream']> & {
            label: {
                /** [plain] The placeholder label for the stream expression */
                stream: string;
            };
        };
    /**
     * A conditional expression, e.g., `truth ? 'yes' 'no'`
     * Start inputs: $1 = description of condition to check
     * Finish inputs: $1 = resulting value
     */
    Conditional: DescriptiveNodeText &
        ExpressionText<['condition'], ['value']> & {
            /** [formatted] When the else case is chosen. */
            afterthen: FormattedText;
            /** [formatted] After the then case is done. */
            else: Template<['jumping']>;
        } & {
            label: {
                /** [plain] A placeholder label for the condition */
                condition: string;
                /** [plain] A placeholder label for the then expression */
                yes: string;
                /** [plain] A placeholder label for the else expression */
                no: string;
            };
        } & Conflicts<{
            /**
             * When the condition is not boolean typed, e.g., `1 ? 'yes' 'no'`
             * Description inputs: $1 = The non-boolean expression
             */
            ExpectedBooleanCondition: ConflictText<['type']> &
                TypeResolutionTemplates;
        }>;
    /**
     * A none coalesce expression, e.g., `value ?? 'default', to choose between a possibly none value and a default.
     */
    Otherwise: DescriptiveNodeText & ExpressionText<[], ['value']>;
    /**
     * A match expression, e.g., `value ??? 1: 'one' 2: 'two' 'other'
     * Start inputs: $1 = description of value expression
     */
    Match: DescriptiveNodeText &
        ExpressionText<['value'], []> & {
            label: {
                /** [plain] The placeholder label for the default value if none of the cases match */
                other: string;
                /** [plain] The placeholder label for the case being checked */
                case: string;
            };
            /** [formatted] How to describe when a case is checked */
            case: FormattedText;
        };
    /** A definition of a conversion, e.g. `→ # #m 5` */
    ConversionDefinition: DescriptiveNodeText<['input', 'output']> &
        SimpleExpressionText &
        Conflicts<{
            /** When a conversion is defined somewhere it's not allowed. */
            MisplacedConversion: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }> & {
            label: {
                /** [plain] The placeholder label for the input type */
                input: string;
                /** [plain] The placeholder label for the output type */
                output: string;
                /** [plain] The placeholder label for the conversion expression */
                expression: string;
            };
        };
    /**
     * A conversion expression, e.g., `1 → ''`
     * Start inputs: $1 = expression to convert
     * Finish inputs: $1 = resulting value
     */
    Convert: DescriptiveNodeText &
        ExpressionText<['expression'], ['value']> &
        Conflicts<{
            /**
             * When conversion could not be found.
             * Description inputs: $1 = from type, $2: to type
             **/
            UnknownConversion: ConflictText<['expected', 'given']> & {
                /** [formatted] Action: drop the convert expression, leaving just the inner value */
                resolution: Template<[]>;
            };
        }> &
        Exceptions<{
            /**
             * When a conversion could not be found during evaluation.
             * Description inputs: $1 = from type, $2: to type$1: From type
             */
            ConversionException: ExceptionText<[], ['from', 'to']>;
        }>;
    /**
     * A translate expression that maps a collection, e.g., `[1 2 3] ↦ . + 1`
     * Start inputs: $expression = collection being translated
     * Finish inputs: $value = resulting collection
     */
    Translate: DescriptiveNodeText &
        ExpressionText<['expression'], ['value']> & {
            /** [formatted] The text shown each time the next item is bound to `.` during iteration. $value = the current item */
            next: Template<['value']>;
        } & Conflicts<{
            /** When the left side of a translate is not a List, Set, Map, or Table. */
            ExpectedCollection: ConflictText<['type']>;
            /** A warning that the body has no `.` referring to the current item. */
            ExpectedThis: ConflictText;
        }>;
    /**
     * A row delete expression, e.g., `table ⎡- 1 < 2`
     * Start inputs: $1 = table expression
     * Finish inputs: $1 = resulting value
     */
    Delete: DescriptiveNodeText & ExpressionText;
    /** A expression with a doc, e.g., ` ¶my doc¶1 + 1 ¶ */
    DocumentedExpression: DescriptiveNodeText & SimpleExpressionText;
    /**
     * An evaluation of a function with inputs, e.g., `myfun(1 2 3)`
     * Description inputs: $1 = name of function being evaluated, $2 = defined if stream, $3 = defined if structure/value
     * Start inputs: none
     * Finish inputs: $1 = resulting value
     */
    Evaluate: DescriptiveNodeText<['name', 'stream', 'structure']> &
        ExpressionText<[], ['value']> & {
            /** [formatted] What to say after inputs are done evaluating, right before starting evaluation the function */
            evaluate: FormattedText;
        } & {
            label: {
                /** [plain] The placeholder label for the function being evaluated */
                function: string;
                /** [plain] The placeholder label for the type inputs */
                types: string;
                /** [plain] The placeholder label for the value inputs */
                inputs: string;
            };
        } & Conflicts<{
            /**
             * When an input given to this evaluate doesn't match the input of the function being evaluated
             * Description inputs: $1 = expected type, $2 = given type
             * */
            IncompatibleInput: ConflictText<['expected', 'given']> &
                TypeResolutionTemplates &
                DivideByZeroConflictText;
            /**
             * When a type input given is not expected.
             * Description inputs: $1 = definition given, $2: type given
             * */
            UnexpectedTypeInput: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When an input is expected, but not given.
             * Description inputs: $1 = function name, $2: missing input
             * */
            MissingInput: ConflictText<['name', 'input']> & {
                /** [formatted] Suggested fix that adds the missing input with a default value */
                resolutionAddInput: Template<['input']>;
                /** [formatted] Suggested fix that adds the missing input as a placeholder so autocomplete can take over */
                resolutionPlaceholder: Template<['input']>;
            };
            /**
             * When the structure definition given is an interface, and can't be created
             */
            NotInstantiable: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When an input value is given but not expected
             * Description inputs: $1 = evaluate with unexected input, $2: unexpected input
             * */
            UnexpectedInput: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When an named input value is given but not a known input name
             */
            UnknownInput: ConflictText<['name']> & {
                /** [formatted] Action: rename the unknown input to a suggested one in the function's signature */
                resolution: Template<['name']>;
            };
            /**
             * When a list of inputs is given but isn't last.
             */
            InputListMustBeLast: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When something looks like an Evaluate with space
             */
            SeparatedEvaluate: ConflictText<['name', 'structure']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['name']>;
            };
            /**
             * When a literal time zone given to Moment or Now isn't a known
             * IANA time zone. $zone = the unrecognized text.
             */
            UnknownTimeZone: ConflictText<['zone']> & {
                /** [formatted] Action description for each suggested repair; $zone = the IANA zone id, $city = its (possibly localized) city name */
                resolution: Template<['zone', 'city']>;
            };
        }> &
        Exceptions<{
            /**
             * When the function being evaluated is not a function.
             * Description inputs: $1 = Expression that didn't produce a function, $2: scope not found in, or undefined
             */
            FunctionException: ExceptionText<[], ['name', 'scope']>;
        }>;
    Input: DescriptiveNodeText & SimpleExpressionText;
    /**
     * An expression placeholder, e.g., `1 + _`
     * Description inputs: $1: type or undefined
     */
    ExpressionPlaceholder: DescriptiveNodeText &
        SimpleExpressionText & {
            label: {
                /** [plain] The placeholder label shown for the empty expression slot */
                placeholder: string;
            };
        } & Conflicts<{
            Placeholder: ConflictText & {
                /** [formatted] Action: replace the placeholder with a concrete candidate (NodeRef) */
                resolution: Template<['candidate']>;
            };
        }> &
        Exceptions<{
            /** No inputs */
            UnimplementedException: ExceptionText;
        }>;
    /**
     * A function, e.g., `ƒ add(a•# b•#) a + b`
     * Description inputs: $1: function name in locale
     */
    FunctionDefinition: DescriptiveNodeText<['name']> &
        SimpleExpressionText &
        Conflicts<{
            /** When a function has no expression */
            NoExpression: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }> & {
            label: {
                /** [plain] The placeholder label for the function's inputs */
                inputs: string;
                /** [plain] The placeholder label for the function's output type */
                output: string;
                /** [plain] The placeholder label for the function's body expression */
                expression: string;
            };
        };
    /**
     * An internal node used by higher order functions to iterate over a list of values.
     * Finish inputs: $1 = resulting value
     */
    Iteration: DescriptiveNodeText &
        ExpressionText<[], ['value']> & {
            /** [formatted] What to say when the iteration initialization begins */
            initialize: FormattedText;
            /** [formatted] What to say when the next value is being gotten */
            next: FormattedText;
            /** [formatted] What to say when the next value is being checked to decide whether to continue */
            check: FormattedText;
        };
    /**
     * Inserting a table row, e.g., `table ⎡+ 1⎦`
     * Start inputs: $1 = table expression
     * Finish inputs: $1: resulting value
     */
    Insert: DescriptiveNodeText & ExpressionText;
    /**
     * Whether the evaluation happening is the first one, e.g., `◆` in `◆ ? 'first' 'later'`
     */
    Initial: DescriptiveNodeText;
    /**
     * A predict to check if a value's type matches, e.g., `1•#`
     * Description inputs: $1 = The type being checked for
     * Start inputs: $1 = expression
     * Finish inputs: $1 = resulting value, $2 = type of value
     */
    Is: DescriptiveNodeText<['type']> &
        ExpressionText<['expression'], ['value', 'type']> &
        Conflicts<{
            /** When the type given isn't possible */
            ImpossibleType: ConflictText<['type']> & {
                /** [formatted] Action: replace an impossible Is test with the constant ⊥ */
                resolutionIsFalse: Template<[]>;
                /** [formatted] Action: drop a redundant `??` operator whose left side is never ø */
                resolutionDropOtherwise: Template<[]>;
            };
        }> &
        Exceptions<{
            /**
             * When a type expected is not the type that was received.
             * Description input: $1 = expected type, $2 = received type
             */
            TypeException: ExceptionText<[], ['expected', 'given']>;
        }>;
    /**
     * Check if the current locale is a particular langauge, e.g., `🌏/en`
     */
    IsLocale: DescriptiveNodeText & SimpleExpressionText<['locale']>;
    /**
     * Getting the value of a list at a particular index, e.g., `list[5]`
     * Start inputs: $1 = list value
     * Finish inputs: $1: resulting value
     */
    ListAccess: DescriptiveNodeText & ExpressionText<['list'], ['value']>;
    /**
     * A list, e.g., `[1 2 3]`
     * Description inputs: $1 = item count
     * Finish inputs: $1 = resulting value
     */
    ListLiteral: DescriptiveNodeText<['count']> & ExpressionText<[], ['value']>;
    /**
     * Applies a locale tag to a computed text value, e.g., `(greeting + name)/en`
     * Start inputs: $1 = the expression being tagged
     */
    Localized: DescriptiveNodeText &
        SimpleExpressionText<['value']> & {
            label: {
                /** [plain] The placeholder label for the expression being tagged */
                value: string;
            };
        };
    /**
     * A way of spreading a list's values into a list literal, e.g., `[ [ 1 2 3]… 4 5]`
     * Description inputs: none
     */
    Spread: DescriptiveNodeText;
    /**
     * A pattern literal, a regular-expression replacement, e.g., `⣿3 # "-" 4 #⣿`. See LANGUAGE.md.
     * Description inputs: $count = number of parts in the pattern
     */
    PatternLiteral: DescriptiveNodeText<['count']> &
        SimpleExpressionText & {
            /** The play-by-play narration shown while single-stepping a match. */
            step: {
                /** [formatted] Said once when a search (`⌕`) begins. */
                search: Template<[]>;
                /** [formatted] Said once when a whole-text test (`≈`) begins. */
                test: Template<[]>;
                /** [formatted] When the search tries the pattern from a new spot. $position = 1-based grapheme position */
                scan: Template<['position']>;
                /** [formatted] When an atom matches the grapheme there. $pattern = the construct, $glyph = the grapheme, $position = 1-based position */
                match: Template<['pattern', 'glyph', 'position']>;
                /** [formatted] When an atom does not match the grapheme there. $pattern = the construct, $glyph = the grapheme, $position = 1-based position */
                miss: Template<['pattern', 'glyph', 'position']>;
                /** [formatted] When an atom needs a grapheme but the text has ended. $pattern = the construct, $position = 1-based position */
                end: Template<['pattern', 'position']>;
                /** [formatted] When a zero-width atom (an anchor or word edge) holds at a position. $pattern = the construct, $position = 1-based position */
                here: Template<['pattern', 'position']>;
                /** [formatted] When a zero-width atom (an anchor or word edge) does not hold at a position. $pattern = the construct, $position = 1-based position */
                nothere: Template<['pattern', 'position']>;
                /** [formatted] When a quantifier repeated enough times to satisfy its bounds. $pattern = the quantified construct, $count = times matched */
                repeat: Template<['pattern', 'count']>;
                /** [formatted] When a quantifier did not repeat enough times. $pattern = the quantified construct, $count = times matched */
                short: Template<['pattern', 'count']>;
            };
        } & Conflicts<{
            /** When a pattern `⣿⣿` has no atoms. */
            EmptyPattern: ConflictText & {
                /** [formatted] Suggested fix that fills an empty pattern with a single any-grapheme atom `◌`. */
                resolution: Template<[]>;
            };
        }>;
    /** A sequence of pattern items inside a pattern literal, e.g., `3 # "-" 4 #`. */
    PatternSequence: DescriptiveNodeText &
        Conflicts<{
            /** When two literal alternatives overlap (one is a prefix of another). */
            OverlappingAlternatives: ConflictText<['shorter', 'longer']>;
        }>;
    /** A character class atom in a pattern, e.g., `◌` (any), `_` (letter), `#` (digit), `␣` (space). */
    PatternClass: DescriptiveNodeText;
    /** A Unicode-property qualifier on a class, e.g., `/greek` in `_/greek`. */
    PatternProperty: DescriptiveNodeText &
        Conflicts<{
            /** When a `/property` name is not a known registry name, script, or Unicode id. */
            UnrecognizedPatternProperty: ConflictText<['name']> & {
                /** [formatted] Suggested fix that replaces the unknown property with the nearest known name. */
                resolution: Template<['suggestion']>;
            };
        }>;
    /** A quantifier count in a pattern, e.g., `3`, `3–5`, `>0`, `≤1`. */
    PatternQuantifier: DescriptiveNodeText &
        Conflicts<{
            /** When a quantifier's bounds can never be satisfied (min > max). */
            MalformedQuantifier: ConflictText & {
                /** [formatted] Suggested fix that swaps the bounds so the smaller comes first. */
                resolution: Template<[]>;
            };
        }>;
    /** A quantified atom in a pattern, e.g., `3 #` or `>0 (◌ | #)`. */
    PatternQuantified: DescriptiveNodeText;
    /** A named capture in a pattern, e.g., `y:(4 #)`. */
    PatternCapture: DescriptiveNodeText &
        Conflicts<{
            /** When two captures in the same pattern share a name. */
            DuplicateCaptureName: ConflictText<['name']> & {
                /** [formatted] Suggested fix that renames this capture to a unique name. */
                resolution: Template<['replacement']>;
            };
        }>;
    /** A complement/negation in a pattern, e.g., `~#` or `~▸(…)`. */
    PatternComplement: DescriptiveNodeText;
    /** A grouping `( … )` in a pattern (grouping only, never captures). */
    PatternGroup: DescriptiveNodeText;
    /** A glyph set `{ … }` in a pattern, matching one of the listed graphemes. */
    PatternSet: DescriptiveNodeText;
    /** A range inside a glyph set, e.g., `"a"–"z"`. */
    PatternRange: DescriptiveNodeText;
    /** A literal text atom in a pattern, e.g., `"-"`. */
    PatternLiteralText: DescriptiveNodeText;
    /** A text anchor in a pattern: `⊢` (start) or `⊣` (end). */
    PatternAnchor: DescriptiveNodeText;
    /** A whole-word atom `▭/‹lang›`, segmented by a locale's word segmenter. */
    PatternWord: DescriptiveNodeText &
        Conflicts<{
            /** When a word `▭` or word-edge `┊` atom has no required locale tag. */
            MissingPatternLocale: ConflictText;
        }>;
    /** A word-boundary atom `┊/‹lang›`. */
    PatternWordEdge: DescriptiveNodeText;
    /** A lookaround in a pattern: `▸(…)` ahead or `◂(…)` behind. */
    PatternLook: DescriptiveNodeText;
    /** A backreference in a pattern — a bare capture name. */
    PatternBackref: DescriptiveNodeText &
        Conflicts<{
            /** When a bare name is neither a capture nor a known class. */
            UndefinedBackreference: ConflictText<['name']> & {
                /** [formatted] Suggested fix that replaces the unknown name with the nearest defined capture or class. */
                resolution: Template<['suggestion']>;
            };
        }>;
    /** The rest-of-input atom `…` in a pattern. */
    PatternRest: DescriptiveNodeText;
    /** A case-folding scope `Aa(…)` in a pattern. */
    PatternCaseFold: DescriptiveNodeText;
    /** The pattern type, `•⣿⣿`. */
    PatternType: DescriptiveNodeText;
    /**
     * A map literal, e.g., `{1:1 2:2 3:3}`
     * Finish inputs: $1 = resulting value
     */
    MapLiteral: DescriptiveNodeText<['count']> &
        ExpressionText<[], ['value']> & {
            label: {
                /** [plain] The placeholder label for the list of key-value pairs */
                values: string;
            };
        } & Conflicts<{
            /**
             * When something other than a key value pair is given.
             * Description inputs: $1 = expression that's not a map
             * */
            NotAKeyValue: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /** A number literal, e.g., `1` */
    NumberLiteral: DescriptiveNodeText<['number', 'unit']> &
        SimpleExpressionText<['value']> &
        Conflicts<{
            /** When something is not a valid number format */
            NotANumber: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /** An internal expression, used to implement core APIs. */
    InternalExpression: DescriptiveNodeText & SimpleExpressionText;
    /** A none literal, e.g., `ø` */
    NoneLiteral: DescriptiveNodeText & SimpleExpressionText;
    /**
     * A previous value of a stream, `← 1 Key()` or `←← 10 Key()`
     * Start inputs: $1 = the stream expression being checked
     * Finish inputs: $1 = resulting value
     */
    Previous: DescriptiveNodeText &
        ExpressionText<['stream'], ['value']> & {
            label: {
                /** [plain] The placeholder label for the range (how many previous values) */
                range: string;
            };
        };
    /**
     * A program, e.g., `1 + 1`, `hello()`, etc.
     * Start inputs: $1 = the stream that caused the evaluation, or nothing
     * Finish inputs: $1 = resulting value
     */
    Program: DescriptiveNodeText &
        ExpressionText<['stream', 'value'], ['value']> & {
            /** [formatted] What to say when the program is halting because of a fatal error */
            halt: FormattedText;
            /** [formatted] What to say when the program is done evaluating */
            done: FormattedText;
            /** [formatted] What to say when the program has yet to evaluate */
            unevaluated: FormattedText;
        } & Exceptions<{
            /** When a program is blank */
            BlankException: ExceptionText;
            /**
             * When the number of function evaluations have exceeded a limit
             * Description inputs: $1 = The function that was evaluated too many times */
            EvaluationLimitException: ExceptionText<[], ['function']>;
            /** When the number of steps have exceeded a limit */
            StepLimitException: ExceptionText;
            /** When a value was expected, but not provided */
            ValueException: ExceptionText;
            /** Internal exception are catastrophic and unrecoverable, usually indicating a defect */
            InternalException: ExceptionText<[], ['reason']>;
            /**
             * When a stream cannot start because the user denied a required browser permission (microphone or camera).
             * Explanation input: $1 = the permission name (microphone or camera)
             */
            PermissionException: ExceptionText<[], ['permission']>;
        }> & {
            label: {
                /** [plain] The placeholder label for the program's borrow statements */
                borrows: string;
                /** [plain] The placeholder label for the program's main expression */
                expression: string;
            };
        };

    /**
     * Revising a structure with a new value, e.g., `mammal.name: 5`
     * Description input: $1 = the name being refined
     * Finish inputs: $1: revised property, $2: revised value
     */
    PropertyBind: DescriptiveNodeText<['name']> &
        ExpressionText<[], ['property', 'value']> & {
            label: {
                /** [plain] The placeholder label for the property being revised */
                property: string;
                /** [plain] The placeholder label for the new property value */
                value: string;
            };
        } & Conflicts<{
            InvalidProperty: ConflictText<['structure']> & {
                /** [formatted] Action: rename to the suggested closest property */
                resolution: Template<['name']>;
            };
        }>;
    /**
     * Getting a structure property, e.g., `mammal.name`
     * Finish inputs: $1: property name, $2: value
     */
    PropertyReference: DescriptiveNodeText<['name']> &
        ExpressionText<[], ['property', 'value']> & {
            label: {
                /** [plain] The placeholder label for the property name being referenced */
                property: string;
            };
        };
    /**
     * Generating a stream of values from other streams, e.g., `a: 1 … ∆ Time() … a + 1`
     * Finish inputs: $1 = resulting value
     */
    Reaction: DescriptiveNodeText &
        ExpressionText<[], ['value']> & {
            label: {
                /** [plain] Placeholder label for the initial value */
                initial: string;
                /** [plain] Placeholder label for the condition to check */
                condition: string;
                /** [plain] Placeholder label for the next value */
                next: string;
            };
        } & Conflicts<{
            /** When the condition doesn't refer to a strema */
            ExpectedStream: ConflictText<['condition']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A bind name, e.g., `a` in `1 + a`
     * Description inputs: $1 = the name
     * Start inputs: $1 = the name being resolved
     */
    Reference: DescriptiveNodeText<['name']> &
        SimpleExpressionText<['name']> & {
            /** [plain] The placeholder label for the name */
            name: string;
        } & Conflicts</** $1: The name that depends on itself */
        {
            /**
             * When the name does not correspond to a bind in scope
             * Description inputs: $1 = Scope
             * */
            UnknownName: {
                conflict: ConflictText<['name', 'scope']>;
                /** [formatted] Suggested fix when a name doesn't resolve to a bind in scope */
                resolution: Template<['suggestion']>;
            };
            /** When a name refers to itself outside a reaction */
            ReferenceCycle: ConflictText<['name']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['name']>;
            };
            /** When a reference refers to a type variable */
            UnexpectedTypeVariable: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }> &
        Exceptions<{
            /**
             * When a name couldn't be found in bindings in scope
             * Description inputs: $1 = Scope in which name was not found */
            NameException: ExceptionText<[], ['name', 'scope']>;
        }>;
    /**
     * A table select, e.g., `table ⎡? one⎦ 1 < 2`
     * Finish inputs: $1 = the table, $2: the result
     */
    Select: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /**
             * When a cell in the row isn't a name
             * Description inputs: $1: The select expression */
            ExpectedSelectName: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A set, e.g., `{ 1 2 3 }`
     * Finish inputs: $1 = the new set!
     */
    SetLiteral: DescriptiveNodeText<['count']> & ExpressionText<[], ['value']>;
    /**
     * A set or map access, e.g., `set{1}`
     * Finish inputs: $1 = the set/map value
     */
    SetOrMapAccess: DescriptiveNodeText &
        ExpressionText<[], ['value']> &
        Conflicts<{
            /**
             * A type of the key given doesn't match the type of the key in the set
             * Description inputs: $1: expected type, $2: given type
             */
            IncompatibleKey: ConflictText<['expected']> &
                TypeResolutionTemplates;
        }>;
    /**
     * A source file that contains a name and program.
     */
    Source: DescriptiveNodeText;
    /**
     * A stream definition.
     * Not typically written, since all streams are defined internally, but basically like a structure definition, e.g., `… Key()` */
    StreamDefinition: DescriptiveNodeText & SimpleExpressionText;
    /**
     * A structure type, e.g., `•Kitty(name•'')`
     * Description inputs: $1 = name of the structure
     */
    StructureDefinition: DescriptiveNodeText<['name']> &
        SimpleExpressionText &
        Conflicts<{
            /** When inputs are declared on a structure with unimplemented functions */
            DisallowedInputs: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a structure implements some functions, but not all */
            IncompleteImplementation: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /** When a structure implements something that isn't an interface */
            NotAnInterface: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When a structure implements an interface, but not all of its functions
             * Description inputs: $1 = Interface, $2 = Function
             */
            UnimplementedInterface: ConflictText<['interface', 'function']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['function']>;
            };
        }> & {
            label: {
                /** [plain] The placeholder label for the structure's documentation */
                docs: string;
                /** [plain] The placeholder label for the structure's inputs */
                inputs: string;
                /** [plain] The placeholder label for the structure's body expression */
                expression: string;
                /** [plain] The placeholder label for the structure's implemented interfaces */
                interfaces: string;
            };
        };
    StructureDefinitionType: DescriptiveNodeText<['name']>;
    /**
     * A table literal, e.g., `⎡a•# b•#⎦⎡1 2⎦`
     * Description inputs: $1 = the number of rows
     * Finish inputs: $1 = resulting table
     */
    TableLiteral: DescriptiveNodeText<['count']> &
        ExpressionText<[], ['value']>;
    /**
     * A text literal, e.g., `'hi'`
     * Description inputs: $1 = the text of the text literal
     */
    TextLiteral: DescriptiveNodeText<['text']> &
        SimpleExpressionText & {
            label: {
                /** [plain] The placeholder label for the list of translation segments */
                texts: string;
            };
        };
    /**
     * One alternate translation of a text literal, e.g., the `'hola/es`' of `'hi'/en'hola'/es`
     * Description inputs: $1 = the text
     */
    Translation: DescriptiveNodeText<['text']> & {
        label: {
            /** [plain] The placeholder label for the translation's segments */
            segments: string;
        };
    } & Conflicts<{
            phone: ConflictText<['text', 'reminder']>;
            email: ConflictText<['text', 'reminder']>;
            address: ConflictText<['text', 'reminder']>;
            tin: ConflictText<['text', 'reminder']>;
            handle: ConflictText<['text', 'reminder']>;
            /** [formatted] How to describe the resolution of the sensitive information conflict. */
            resolution: FormattedText;
            /** [formatted] Note to remind users where they can manage sensitive information for their project. */
            reminder: FormattedText;
            character: ConflictText & {
                /** [formatted] Action: strip the special concept-link characters from the translation */
                resolutionStrip: Template<[]>;
            };
        }>;
    /**
     * A formatted text literal, e.g., ` `hello *wordplay*` `
     * Description inputs: $1 = the text
     */
    FormattedLiteral: DescriptiveNodeText<['text']> & SimpleExpressionText;
    /**
     * One alternate translation of a formatted text literal, e.g., ` `*hello*`/en`*hola*`/es` `
     * Description inputs: $1 = the text
     */
    FormattedTranslation: DescriptiveNodeText<['language']>;
    /**
     * A reference to the containing value of a structure, conversion, or reaction, e.g., the `.` in `1 … ∆ Key() ? . + 1
     * Finish inputs: $1 = resulting value
     */
    This: DescriptiveNodeText &
        SimpleExpressionText<['value']> &
        Conflicts<{
            MisplacedThis: ConflictText & {
                /** [formatted] Action: replace with a placeholder so the learner can pick a value in scope */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A unary operation, e.g., `-1`
     * Description inputs: $1 = the operator
     * Finish inputs: $1 = resulting value
     */
    UnaryEvaluate: DescriptiveNodeText<['operator']> &
        ExpressionText<[], ['value']> & {
            label: {
                /** [plain] The placeholder label for the input expression */
                input: string;
            };
        };
    /**
     * An unparsable expression, e.g., `]a[` */
    UnparsableExpression: DescriptiveNodeText &
        SimpleExpressionText &
        Conflicts<{
            /**
             * When an unparsable expression or type is used.
             * Description inputs: $1: true if expression, false if type
             */
            UnparsableConflict: {
                conflict: ConflictText<['expression']>;
                /** [formatted] Suggested fix for an unparsable expression or type */
                resolution: Template<['first', 'second']>;
            };
            /**
             * When a delimiter is unclosed.
             * Description inputs: $1: unclosed token, $2: opening delimiter
             * */
            UnclosedDelimiter: ConflictText<['unclosed', 'expected']> & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<['expected']>;
            };
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
    Update: DescriptiveNodeText &
        ExpressionText &
        Conflicts<{
            /** When a column name was expected but not given */
            ExpectedColumnBind: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
            /**
             * When a value was given that didn't match the expected type of the column
             * Description inputs: $1: expected type, $2: given type
             * */
            IncompatibleCellType: ConflictText<['expected', 'given']> &
                TypeResolutionTemplates;
        }>;
    /** Any type. Not actually written in code, but can be generated internally. */
    AnyType: DescriptiveNodeText;
    /** A boolean type, e.g., `?` */
    BooleanType: DescriptiveNodeText;
    /** A conversion type, e.g., `? → ''` */
    ConversionType: DescriptiveNodeText;
    /** A formatted type, e.g., ` ¶ ` */
    FormattedType: DescriptiveNodeText;
    /** An exception type, e.g., `!` */
    ExceptionType: DescriptiveNodeText;
    /** A function type, e.g., `ƒ(magic•#)•#` */
    FunctionType: DescriptiveNodeText<['inputs']>;
    /**
     * A list type, e.g., `[#]`
     * Description inputs: $1 = item type or undefined
     */
    ListType: DescriptiveNodeText<['type']>;
    /**
     * A map type, e.g., `{#:#}`
     * Description inputs: $1 = Key type or undefined, $2 = value type or undefined
     */
    MapType: DescriptiveNodeText<['key', 'value']>;
    /**
     * A number type, e.g., `#m`
     * Description inputs: $1 = the unit or undefined
     */
    NumberType: DescriptiveNodeText<['unit']>;
    /**
     * A named type, e.g., `Kitty`
     * Description inputs: $1 = the type name
     */
    NameType: DescriptiveNodeText<['name']> &
        Conflicts<{
            /**
             * A type representing an unknown name
             * Description inputs: $1 = Invalid type
             * */
            UnknownTypeName: ConflictText<['type']> & {
                /** [formatted] Action: replace the bad NameType with a type placeholder */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A type that is not possible
     */
    NeverType: DescriptiveNodeText;
    /**
     * A type representing nothing, e.g., `ø`
     */
    NoneType: DescriptiveNodeText;
    /**
     * A set type, e.g., `{#}`
     * Description inputs: $1 = type or undefined
     */
    SetType: DescriptiveNodeText<['type']>;
    /** A type of stream, internally generated */
    StreamDefinitionType: DescriptiveNodeText;
    /** A type of stream, e.g., `… #` */
    StreamType: DescriptiveNodeText;
    /**
     * A structure type, internally generated to represent a structure definition.
     * Description inputs: $1 = name of structure
     */
    StructureType: DescriptiveNodeText<['name']>;
    /**
     * A table type, e.g., `⎡a•# b•"" c•Cat⎦`
     */
    TableType: DescriptiveNodeText &
        Conflicts<{
            /**
             * When a column's type is missing
             * Description inputs: $1 = The missing column */
            ExpectedColumnType: ConflictText & {
                /** [formatted] Action description for the repair this conflict offers */
                resolution: Template<[]>;
            };
        }>;
    /**
     * A text type, e.g., `''`
     * Description inputs: $1 = concrete type or undefined
     */
    TextType: DescriptiveNodeText<['text']>;
    /**
     * A type placeholder, `_`
     */
    TypePlaceholder: DescriptiveNodeText;
    /**
     * Two possible types, e.g., `# | ''`
     * Description inputs: $1 = first type, $2 = second type
     */
    UnionType: DescriptiveNodeText<['first', 'second']> & {
        /** [formatted] Suffix appended after a code-rendered, truncated UnionType when there are too many members to show inline. $1 = how many members were omitted. Rendered next to (not in place of) the truncated code form. */
        elidedSuffix: Template<['omitted']>;
    };
    /**
     * A type that can't be parsed.
     */
    UnparsableType: DescriptiveNodeText;
    /**
     * A unit of a number, e.g., `m` in `1m`
     * Description inputs: $1 = unit description
     */
    Unit: DescriptiveNodeText<['unit']>;
    /**
     * A type representing an unknown type variable
     */
    VariableType: DescriptiveNodeText;
    /**
     * A type that is not known. All unknown types are rendered as a sequence of reasons, e.g., 'unknown type because X because Y because Z..."".
     * The unknown type description is used for the beginning of this message, and then the connector below is used to string them together. */
    UnknownType: DescriptiveNodeText & {
        /** [plain] The connector between reasons, e.g., "because " */
        connector: string;
    };
    /**
     * A type representing an unknown named type, e.g., `b` in `a: b + 1`
     * Description inputs: $1 = name that's not known or undefined
     */
    UnknownNameType: DescriptiveNodeText<['name']>;
    /** A type that depends on itself and is therefore unknown, e.g., `a: a + 1`. */
    CycleType: DescriptiveNodeText;
    /** A variable type that is not defined, e.g., `C` in `ƒ help⸨A⸩(b•C)` */
    UnknownVariableType: DescriptiveNodeText;
    /** An unknown type because no expression was given in a block, e.g., () */
    NoExpressionType: DescriptiveNodeText;
    /** An unknown type because `.` is not defined in scope, e.g., `a: 1 + .` */
    NotEnclosedType: DescriptiveNodeText;
    /** An unknown type because of a placeholder expression, e.g., `a: 1 + _` */
    NotImplementedType: DescriptiveNodeText;
    /**
     * Something that does not have a specific expected type, e.g., `list['hi']`
     * Description inputs: $1 = type expected
     */
    NotAType: DescriptiveNodeText<['type']>;
    /**
     * Non-function type, e.g., `1(2 3)`
     * Description inputs: $1 = the type of the given function
     * */
    NonFunctionType: DescriptiveNodeText<['type']>;
};

export type NodeDescriptor = keyof NodeTexts;

export { type NodeTexts as default };
