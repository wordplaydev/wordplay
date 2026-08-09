/** Functionality related to automatically completing a text insertion */

import type Project from '@db/projects/Project';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import Convert from '@nodes/Convert';
import Evaluate from '@nodes/Evaluate';
import Example from '@nodes/Example';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import Input from '@nodes/Input';
import Is from '@nodes/Is';
import ListAccess from '@nodes/ListAccess';
import ListType from '@nodes/ListType';
import Literal from '@nodes/Literal';
import MapType from '@nodes/MapType';
import Names from '@nodes/Names';
import Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Paragraph, { type Segment } from '@nodes/Paragraph';
import Program from '@nodes/Program';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import This from '@nodes/This';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import SetType from '@nodes/SetType';
import Source from '@nodes/Source';
import StreamDefinitionType from '@nodes/StreamDefinitionType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import StructureType from '@nodes/StructureType';
import { Sym } from '@nodes/Sym';
import TypePlaceholder from '@nodes/TypePlaceholder';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import {
    BIND_SYMBOL,
    CODE_SYMBOL,
    CONVERT_SYMBOL,
    DIFFERENCE_SYMBOL,
    DOT_SYMBOL,
    ELISION_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    EXPONENT_SYMBOL,
    LIST_OPEN_SYMBOL,
    LIST_OPEN_SYMBOL_FULL,
    PLACEHOLDER_SYMBOL,
    PRODUCT_SYMBOL,
    SET_OPEN_SYMBOL,
    SET_OPEN_SYMBOL_FULL,
    STREAM_SYMBOL,
    SUM_SYMBOL,
    TAG_OPEN_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';
import {
    DelimiterCloseByOpen,
    FormattingSymbols,
    tokens,
} from '@parser/Tokenizer';
import type Caret from '@edit/caret/Caret';

type InsertInfo = {
    /** The caret where the insertion is happening */
    caret: Caret;
    /** The project of the source being inserted into */
    project: Project;
    /** The source being inserted into */
    source: Source;
    /** The position in the source's glyph sequence */
    position: number;
    /** The text being inserted */
    text: string;
    /** Whether to permit only syntactically and semantically valid edits */
    validOnly: boolean;
};

/** The text inserted, the revised source, the new caret position or node, and whether a symbol was "closed" by adding a single character. */
type Revision = [Source, number | Node];

type Trigger = {
    /** The symbol that triggers this autocomplete */
    symbol: string | string[] | ((text: string) => boolean);
    /** The function that generates the revision for this autocomplete */
    revise: (info: InsertInfo) => Revision | undefined;
    /**
     * Whether this completion only applies in blocks mode. Completions that insert placeholder
     * templates or select nodes interfere with typing a syntactically correct sequence of
     * characters in text mode — the only thing text mode may auto-insert is text the creator
     * would have typed later anyway (closing delimiters), which typing can then type over.
     */
    blocksOnly: boolean;
};

/** A list of autocompletions by symbol triggers, and the order in which to consider them. */
const AutocompleteTriggers: Trigger[] = [
    {
        symbol: EVAL_OPEN_SYMBOL,
        revise: completeEvaluate,
        blocksOnly: true,
    },
    { symbol: CONVERT_SYMBOL, revise: completeConvert, blocksOnly: true },
    {
        symbol: Object.keys(DelimiterCloseByOpen),
        revise: completeDelimiter,
        blocksOnly: false,
    },
    { symbol: '.', revise: completeStream, blocksOnly: false },
    {
        symbol: (text) => tokens(text)[0]?.isSymbol(Sym.Operator),
        revise: completeOperatorEvaluate,
        blocksOnly: true,
    },
    { symbol: TYPE_SYMBOL, revise: completeIs, blocksOnly: true },
    { symbol: BIND_SYMBOL, revise: completeBindOrKeyValue, blocksOnly: true },
    { symbol: TAG_OPEN_SYMBOL, revise: completeLink, blocksOnly: true },
    { symbol: CODE_SYMBOL, revise: completeExample, blocksOnly: true },
];

/** Given some text to insert, get a revision based on any eligible autocompletions. */
export function completeInsertion(
    /** The project the source is in */
    project: Project,
    /** The caret where the insertion is happening */
    caret: Caret,
    /** The text being inserted */
    text: string,
    /** Whether to permit only syntactically and semantically valid edits */
    validOnly: boolean,
): Revision | undefined {
    const source = caret.source;
    const position = caret.position;

    if (typeof position !== 'number') return undefined;

    // The unparsable count a plain insertion of the text would produce, computed lazily since
    // most keystrokes produce no completion at all.
    let rawUnparsables: number | undefined = undefined;

    // Iterate through the autocomplete triggers to see if any apply.
    for (const trigger of AutocompleteTriggers) {
        // Completions that build placeholder templates only run in blocks mode.
        if (trigger.blocksOnly && !validOnly) continue;
        if (
            Array.isArray(trigger.symbol)
                ? trigger.symbol.includes(text)
                : typeof trigger.symbol === 'function'
                  ? trigger.symbol(text)
                  : text === trigger.symbol
        ) {
            // Catch any replacement errors.
            try {
                const result = trigger.revise({
                    text,
                    caret,
                    project,
                    source,
                    position,
                    validOnly,
                });
                // If the revised source didn't change (likely because the edit wasn't allowed)
                // then we don't make the edit.
                if (result !== undefined && !source.isEqualTo(result[0])) {
                    // A completion must never parse worse than what typing the text alone would
                    // produce; if it does, skip it so a later trigger or the plain insertion runs.
                    rawUnparsables ??= countUnparsables(
                        source.withGraphemesAt(text, position),
                    );
                    if (countUnparsables(result[0]) > rawUnparsables) continue;
                    return result;
                }
            } catch (_) {}
        }
    }
}

/** How many unparsable nodes a source contains, for comparing a completion to a plain insertion.
 * An impossible insertion counts as infinitely unparsable, so a completion is never rejected in its favor. */
function countUnparsables(source: Source | undefined): number {
    return source === undefined
        ? Infinity
        : source.nodes(
              (node) =>
                  node instanceof UnparsableExpression ||
                  node instanceof UnparsableType,
          ).length;
}

function getPrecedingExpression(
    source: Source,
    position: number,
    exact: boolean,
): Expression[] {
    return source.nodes().filter((node): node is Expression => {
        const start = source.getNodeLastPosition(node);
        if (start === undefined) return false;
        return (
            node instanceof Expression &&
            !(node instanceof Program) &&
            !(node instanceof Source) &&
            !(node instanceof Block && node.isRoot()) &&
            !(node instanceof Bind) &&
            (start === position || (!exact && start + 1 === position))
        );
    });
}

function getPrecedingMarkup(source: Source, position: number): Words[] {
    return source
        .nodes()
        .filter(
            (node): node is Words =>
                node instanceof Words &&
                source.getNodeLastPosition(node) === position,
        );
}

function completeEvaluate({
    project,
    source,
    position,
}: InsertInfo): Revision | undefined {
    // If the inserted character is an open parenthesis, see if we can construct an evaluate with the preceding expression.
    // Find the top most expression that ends where the caret is.
    const precedingExpressions = getPrecedingExpression(
        source,
        position,
        true,
    ).filter(
        (node) =>
            node instanceof Reference ||
            node instanceof PropertyReference ||
            (node instanceof Block && !node.isRoot()),
    );

    if (precedingExpressions.length === 0) return undefined;

    const propertyReference = precedingExpressions.find(
        (node): node is PropertyReference => node instanceof PropertyReference,
    );
    const precedingExpression = propertyReference ?? precedingExpressions[0];

    const context = project.getNodeContext(precedingExpression);
    const fun = precedingExpression.getType(context);
    if (
        fun instanceof FunctionType ||
        fun instanceof StructureType ||
        fun instanceof StructureDefinitionType ||
        fun instanceof StreamDefinitionType
    ) {
        const definition =
            fun instanceof FunctionType
                ? fun.definition
                : fun instanceof StructureType
                  ? fun.definition
                  : fun instanceof StructureDefinitionType
                    ? fun.type.definition
                    : fun instanceof StreamDefinitionType
                      ? fun.definition
                      : undefined;
        const evaluate = definition
            ? definition.getEvaluateTemplate(
                  precedingExpression instanceof Reference
                      ? precedingExpression.getName()
                      : context.getBasis().locales,
                  context,
                  false,
                  false,
                  precedingExpression,
              )
            : Evaluate.make(precedingExpression, []);
        // Make a new source
        const newSource = source.replace(
            precedingExpression,
            evaluate,
            'exception',
        );
        if (newSource === source) return undefined;
        const firstPlaceholder = evaluate.nodes(
            (n) => n instanceof ExpressionPlaceholder,
        )[0];
        // Place the caret on the first placeholder, or before the close.
        const newPosition =
            firstPlaceholder !== undefined
                ? firstPlaceholder
                : ((evaluate instanceof Evaluate
                      ? evaluate.close
                          ? newSource.getNodeFirstPosition(evaluate.close)
                          : newSource.getNodeLastPosition(evaluate)
                      : position) ?? position);

        return [newSource, newPosition];
    }
    return undefined;
}

function completeConvert({
    source,
    position,
}: InsertInfo): Revision | undefined {
    // What's the preceding expression? Prefer an exact position match to avoid
    // selecting an inner node (e.g. the "1" inside "(1)") that happens to match
    // via the +1 fuzzy rule when a parent node ends exactly at the cursor.
    let precedingExpression: Expression | undefined =
        getPrecedingExpression(source, position, true)[0] ??
        getPrecedingExpression(source, position, false)[0];
    if (precedingExpression === undefined) return undefined;

    // Replace the preceding expression with a conversion of it.
    const placeholder = TypePlaceholder.make();
    const newSource = source.replace(
        precedingExpression,
        Convert.make(precedingExpression, placeholder),
        'exception',
    );
    if (newSource !== source) return [newSource, placeholder];
}

function completeDelimiter({
    caret,
    text,
    source,
    project,
    position,
    validOnly,
}: InsertInfo): Revision | undefined {
    // If the inserted string matches a single matched delimiter, complete it, unless:
    // 1) we’re immediately before an matched closing delimiter, in which case we insert nothing, but move the caret forward
    // 2) the character being inserted closes an unmatched delimiter, in which case we just insert the character.
    if (
        ((!caret.isInsideContent() &&
            (!FormattingSymbols.includes(text) ||
                // Allow the elision symbol, since it can be completed outside of words.
                text === ELISION_SYMBOL)) ||
            // Formatting only has meaning in markup words, not text literal words.
            // The cheap includes check gates the ancestor walk.
            (FormattingSymbols.includes(text) &&
                caret.isInsideMarkupWords()) ||
            // A code delimiter opens an example or an interpolation, which is exactly what it
            // means inside words, in both markup and text literals. Leaving it unclosed here
            // would strand every delimiter typed inside the code that follows.
            text === CODE_SYMBOL) &&
        (caret.tokenPrior === undefined ||
            // The text typed does not close an unmatched delimiter
            (caret.source.getUnmatchedDelimiter(caret.tokenPrior, text) ===
                undefined &&
                !(
                    // The token prior is text or unknown
                    caret.tokenPrior.isSymbol(Sym.Text) ||
                    caret.tokenPrior.isSymbol(Sym.Unknown)
                )))
    ) {
        let newPosition: Node | number = position;
        let newSource = source;

        // Access templates only apply in blocks mode; in text mode they would insert a
        // placeholder the creator didn't type and select it, interfering with typing.
        // Skipping them also keeps type analysis out of the text-mode keystroke path.
        const preceding = validOnly
            ? getPrecedingExpression(source, position, false).map((node) => ({
                  expression: node,
                  type: node.getType(project.getNodeContext(node)),
              }))
            : [];
        // Only the matching bracket turns a preceding list or set into an access:
        // ListAccess and SetOrMapAccess build their own delimiters, so without this
        // check any auto-closing character typed after a list — a quote, a table, a
        // set — would silently become `list[_]` instead of what was asked for.
        const precedingList =
            text === LIST_OPEN_SYMBOL || text === LIST_OPEN_SYMBOL_FULL
                ? preceding.filter(
                      (preceding) => preceding.type instanceof ListType,
                  )[0]?.expression
                : undefined;
        const precedingSet =
            text === SET_OPEN_SYMBOL || text === SET_OPEN_SYMBOL_FULL
                ? preceding.filter(
                      (preceding) =>
                          preceding.type instanceof SetType ||
                          preceding.type instanceof MapType,
                  )[0]?.expression
                : undefined;

        // Insert an empty block in valid only mode and place the caret at the placeholder.
        if (validOnly && text === EVAL_OPEN_SYMBOL) {
            text += PLACEHOLDER_SYMBOL + EVAL_CLOSE_SYMBOL;
            const newSource = source.withGraphemesAt(text, position);
            const placeholder = newSource
                ?.nodes()
                .find(
                    (n) => newSource?.getNodeFirstPosition(n) === position + 1,
                );
            newPosition = placeholder ?? position + text.length;
            if (newSource) return [newSource, newPosition];
        }
        // Is the preceding expression a list? Complete a list close
        else if (precedingList) {
            const placeholder = ExpressionPlaceholder.make(NumberType.make());
            const newSource = source.replace(
                precedingList,
                ListAccess.make(precedingList, placeholder),
                'exception',
            );
            if (newSource) return [newSource, placeholder];
        } else if (precedingSet) {
            const placeholder = ExpressionPlaceholder.make();
            const newSource = source.replace(
                precedingSet,
                SetOrMapAccess.make(precedingSet, placeholder),
                'exception',
            );
            if (newSource) return [newSource, placeholder];
        } else {
            const closeChar = DelimiterCloseByOpen[text];
            // If the closing delimiter is already immediately after the cursor, don't insert it.
            if (source.getGraphemeAt(position) !== closeChar) {
                text += closeChar;
                newSource = source.withGraphemesAt(text, position) ?? newSource;
                if (newSource) return [newSource, position + 1];
            }
        }
    }
    return undefined;
}

function completeStream({
    caret,
    source,
    position,
}: InsertInfo): Revision | undefined {
    // Dots in a text literal or markup words are prose, not a stream symbol being typed.
    if (caret.isInsideWords()) return undefined;
    // If the two preceding characters are dots and this is a dot, delete the last two dots then insert the stream symbol.
    if (
        source.getGraphemeAt(position - 1) === '.' &&
        source.getGraphemeAt(position - 2) === '.'
    ) {
        const newSource = source
            .withoutGraphemeAt(position - 2)
            ?.withoutGraphemeAt(position - 2)
            ?.withGraphemesAt(STREAM_SYMBOL, position - 2);
        if (newSource) return [newSource, position - 1];
    }
    return undefined;
}

/**
 * If the inserted character is an operator, see if we can construct an evaluation from it: a unary
 * evaluation with a placeholder operand, if the caret is in an empty expression slot, or a binary
 * evaluation with the preceding expression and a placeholder on the right.
 */
function completeOperatorEvaluate(info: InsertInfo): Revision | undefined {
    // If the inserted character has a non-binary-operator meaning in the language grammar (e.g., `|`
    // separates types in a UnionType), skip the completion so the character can be typed literally
    // and resolved by the parser from the surrounding context. We detect this by checking whether the
    // character's token carries a structural Sym type beyond Sym.Operator (Sym.Region is excluded —
    // it applies only inside language tags within Numbers and doesn't conflict at expression level).
    if (
        tokens(info.text)[0]?.types.some(
            (t) => t !== Sym.Operator && t !== Sym.Region,
        )
    )
        return undefined;

    // An empty slot means there's nothing at the caret, so no preceding expression can be the
    // operator's left operand — not even one that ends just before an intervening token, like a
    // reaction's `…`. Try the prefix form there first; everything else gets the binary form.
    return completeUnaryEvaluate(info) ?? completeBinaryEvaluate(info);
}

/** The expressions that end where the caret is, top most first. */
function getPrecedingOperands(source: Source, position: number): Expression[] {
    return getPrecedingExpression(source, position, false).filter(
        (node): node is Expression =>
            node instanceof Expression &&
            !(node instanceof Program) &&
            !(node instanceof Source) &&
            !(node instanceof Block && node.isRoot()),
    );
}

/**
 * If the caret is where an expression is expected but missing, the operator can only be a prefix, so
 * complete a unary evaluation with a placeholder operand. Which unary function the operator names is
 * left to type checking, just as it is for an operator the parser reads as a prefix.
 */
function completeUnaryEvaluate({
    text,
    caret,
    source,
    position,
}: InsertInfo): Revision | undefined {
    // Inside a token — a text literal, a name, markup words — there's no expression slot at all.
    if (caret.insideToken()) return undefined;

    const prior =
        position > 0 ? source.getTokenAt(position - 1, false) : undefined;
    const priorGrapheme =
        position > 0 ? source.getGraphemeAt(position - 1) : undefined;
    const afterSpace = priorGrapheme !== undefined && /\s/.test(priorGrapheme);

    // `+` and `-` after whitespace may be starting a negative number literal, which the tokenizer
    // signs — the same reason the binary form skips them. Typing `5` next gives `-5` either way.
    if ((text === SUM_SYMBOL || text === DIFFERENCE_SYMBOL) && afterSpace)
        return undefined;

    // An expression is expected here if the parser left an empty stand-in for one, if nothing at all
    // ends here, or if an opening delimiter does — the three ways an expression slot goes unfilled.
    // The Syms are checked directly rather than through DelimiterCloseByOpen, which also holds the
    // markup formatting pairs (so a `_` placeholder would count as an opening delimiter).
    const expressionExpected =
        getPrecedingOperands(source, position).some(
            (node) => node instanceof UnparsableExpression && node.isEmpty(),
        ) ||
        getPrecedingExpression(source, position, true).length === 0 ||
        (prior !== undefined &&
            (prior.isSymbol(Sym.EvalOpen) ||
                prior.isSymbol(Sym.ListOpen) ||
                prior.isSymbol(Sym.SetOpen) ||
                prior.isSymbol(Sym.TableOpen)));
    if (!expressionExpected) return undefined;

    // Separate two adjacent operators, or the parser reads the first one as the prefix instead:
    // `⊤ &~_` is two statements, while `⊤ & ~_` is the conjunction that was typed. Inserting text
    // rather than replacing a node keeps this decision here, where the parse depends on it — a node
    // replacement pretty-prints rooted at the replacement, which can't see the field's spacing.
    const space = !afterSpace && prior?.isSymbol(Sym.Operator) ? ' ' : '';
    const newSource = source.withGraphemesAt(
        space + text + PLACEHOLDER_SYMBOL,
        position,
    );
    if (newSource === undefined) return undefined;

    // Confirm with the grammar that the operator really did become a prefix, and take its operand as
    // the caret target. Walking to it is how we find the placeholder, so this costs nothing extra.
    const operator = newSource.getTokenAt(position + space.length, false);
    const reference = operator ? newSource.root.getParent(operator) : undefined;
    const unary = reference ? newSource.root.getParent(reference) : undefined;
    if (!(reference instanceof Reference && unary instanceof UnaryEvaluate))
        return undefined;
    // Place the caret on the placeholder
    return [newSource, unary.input];
}

/**
 * If there's an expression preceding the caret that the operator can take as a left operand, complete
 * a binary evaluation with it and a placeholder on the right.
 */
function completeBinaryEvaluate({
    text,
    source,
    position,
    project,
}: InsertInfo): Revision | undefined {
    // The top most expression ending where the caret is is the candidate left operand.
    const precedingExpression: Expression | undefined = getPrecedingOperands(
        source,
        position,
    )[0];

    if (precedingExpression === undefined) return undefined;

    if (
        precedingExpression instanceof NumberLiteral &&
        !precedingExpression.unit?.isEmpty() &&
        (text === PRODUCT_SYMBOL ||
            text === DOT_SYMBOL ||
            text === EXPONENT_SYMBOL)
    )
        return undefined;

    // Typing `%` right after a NumberLiteral should append a percent suffix to
    // the number (turning `50` into `50%`), not start a modulo BinaryEvaluate.
    // Skip the binary completion so the `%` lands as a regular character on
    // the literal.
    if (
        precedingExpression instanceof NumberLiteral &&
        !precedingExpression.isPercent() &&
        text === '%'
    )
        return undefined;

    // Don't complete + or - as binary operators when there is whitespace between
    // the preceding expression and the caret — they may be starting a new number literal.
    if (
        (text === SUM_SYMBOL || text === DIFFERENCE_SYMBOL) &&
        source.getNodeLastPosition(precedingExpression) !== position
    )
        return undefined;

    const context = project.getNodeContext(precedingExpression);
    const definition = precedingExpression
        .getType(context)
        .getDefinitionOfNameInScope(text, context);

    // The language requires a binary operator's function to take exactly one input: zero is an
    // UnexpectedInput conflict and more than one a MissingInput. Same guard as Caret.wrap.
    if (definition instanceof FunctionDefinition && definition.isBinary()) {
        const binary = new BinaryEvaluate(
            // Atomic left operands (literals, references, placeholders, and the
            // `⬚` This reference) never need parentheses; only wrap compound
            // expressions for clarity.
            precedingExpression instanceof Literal ||
                precedingExpression instanceof Reference ||
                precedingExpression instanceof ExpressionPlaceholder ||
                precedingExpression instanceof This
                ? precedingExpression
                : Block.make([precedingExpression]),
            new Reference(tokens(text)[0]),
            ExpressionPlaceholder.make(),
        );

        // Make a new source
        const newSource = source.replace(
            precedingExpression,
            binary,
            'exception',
        );
        // Place the caret on the placeholder
        if (newSource !== source) return [newSource, binary.right];
    }
}

/** Complete an is type check on the preceding expression */
function completeIs({ source, position }: InsertInfo): Revision | undefined {
    // Find the top most expression that ends where the caret is.
    const precedingExpression = getPrecedingExpression(
        source,
        position,
        true,
    )[0];
    if (precedingExpression === undefined) return undefined;
    // Expression placeholders use •Type to type themselves.
    const isExpressionPlaceholder =
        precedingExpression instanceof ExpressionPlaceholder;

    const placeholder = TypePlaceholder.make();
    // Make a new source
    const newSource = source.replace(
        precedingExpression,
        isExpressionPlaceholder
            ? precedingExpression.withType(placeholder)
            : Is.make(precedingExpression, placeholder),
        'exception',
    );
    // Place the caret on the placeholder
    if (newSource !== source) return [newSource, placeholder];
}

/** On a :, complete a Bind, Input, or KeyValue */
function completeBindOrKeyValue({
    source,
    position,
}: InsertInfo): Revision | undefined {
    const preceding = getPrecedingExpression(source, position, true).filter(
        (node) => node instanceof Reference || node instanceof Is,
    )[0];
    if (preceding === undefined) return undefined;
    const reference = preceding.nodes((node) => node instanceof Reference)[0];
    if (reference === undefined) return undefined;

    // If there's already non-whitespace content on the same line after the
    // caret, skip the placeholder — the parser will treat what follows as the
    // bind's value, and a placeholder would just duplicate or displace it.
    let i = position;
    let next = source.getGraphemeAt(i);
    while (next !== undefined && next !== '\n') {
        if (next !== ' ' && next !== '\t') return undefined;
        i++;
        next = source.getGraphemeAt(i);
    }

    const placeholder = ExpressionPlaceholder.make(
        preceding instanceof Is ? preceding.type : undefined,
    );
    // A reference in an Evaluate's inputs is a named input being typed, not a
    // bind: complete an Input so the input mapping matches it by name. A Bind
    // here would be treated as a positional expression and mapped (and
    // labeled) as whatever unset input its position happens to reach.
    const parent = source.root.getParent(preceding);
    const completion =
        preceding instanceof Reference &&
        parent instanceof Evaluate &&
        parent.inputs.includes(preceding)
            ? Input.make(reference.name.getText(), placeholder)
            : Bind.make(
                  undefined,
                  Names.make([reference.name.getText()]),
                  preceding instanceof Is ? preceding.type.clone() : undefined,
                  placeholder,
              );
    // Make a new source
    const newSource = source.replace(preceding, completion, 'exception');
    // Place the caret on the placeholder
    if (newSource !== source) return [newSource, placeholder];
}

/** Complete a web link inside a paragraph */
function completeLink(info: InsertInfo): Revision | undefined {
    // The placeholder URL needs a host, or the inserted template wouldn't lex as a URL token.
    return completeMarkup(info, WebLink.make('', 'https://example.com'));
}

/** Complete a example program inside a paragraph */
function completeExample(info: InsertInfo): Revision | undefined {
    return completeMarkup(info, Example.make(Program.make([])));
}

function completeMarkup(
    { source, position }: InsertInfo,
    segment: Segment,
): Revision | undefined {
    const precedingMarkup = getPrecedingMarkup(source, position);
    const content = precedingMarkup[0];
    const parent = source.root.getParent(content);

    if (!(parent instanceof Words || parent instanceof Paragraph))
        return undefined;

    const index = parent.segments.indexOf(content);
    if (index < 0) return undefined;

    const newSource = source.replace(
        parent,
        parent.withSegmentInsertedAt(index + 1, segment),
        'exception',
    );

    if (newSource !== source) return [newSource, position + 1];

    return undefined;
}
