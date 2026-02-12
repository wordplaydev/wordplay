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
import FunctionType from '@nodes/FunctionType';
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
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import SetType from '@nodes/SetType';
import Source from '@nodes/Source';
import StreamDefinitionType from '@nodes/StreamDefinitionType';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import StructureType from '@nodes/StructureType';
import Sym from '@nodes/Sym';
import TypePlaceholder from '@nodes/TypePlaceholder';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import {
    BIND_SYMBOL,
    CODE_SYMBOL,
    CONVERT_SYMBOL,
    ELISION_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    EXPONENT_SYMBOL,
    PLACEHOLDER_SYMBOL,
    PRODUCT_SYMBOL,
    STREAM_SYMBOL,
    TAG_OPEN_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';
import {
    DelimiterCloseByOpen,
    FormattingSymbols,
    tokens,
} from '@parser/Tokenizer';
import type Caret from './Caret';

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
};

/** A list of autocompletions by symbol triggers, and the order in which to consider them. */
const AutocompleteTriggers: Trigger[] = [
    {
        symbol: EVAL_OPEN_SYMBOL,
        revise: completeEvaluate,
    },
    { symbol: CONVERT_SYMBOL, revise: completeConvert },
    { symbol: Object.keys(DelimiterCloseByOpen), revise: completeDelimiter },
    { symbol: '.', revise: completeStream },
    {
        symbol: (text) => tokens(text)[0]?.isSymbol(Sym.Operator),
        revise: completeBinaryEvaluate,
    },
    { symbol: TYPE_SYMBOL, revise: completeIs },
    { symbol: BIND_SYMBOL, revise: completeBindOrKeyValue },
    { symbol: TAG_OPEN_SYMBOL, revise: completeLink },
    { symbol: CODE_SYMBOL, revise: completeExample },
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

    // Iterate through the autocomplete triggers to see if any apply.
    for (const trigger of AutocompleteTriggers) {
        if (
            Array.isArray(trigger.symbol)
                ? trigger.symbol.includes(text)
                : typeof trigger.symbol === 'function'
                  ? trigger.symbol(text)
                  : text === trigger.symbol
        ) {
            const result = trigger.revise({
                text,
                caret,
                project,
                source,
                position,
                validOnly,
            });
            if (result !== undefined) {
                return result;
            }
        }
    }
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
                  precedingExpression,
              )
            : Evaluate.make(precedingExpression, []);
        // Make a new source
        const newSource = source.replace(precedingExpression, evaluate);
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
    // What's the preceding expression?
    const precedingExpression = getPrecedingExpression(
        source,
        position,
        false,
    )[0];
    if (precedingExpression === undefined) return undefined;

    // Replace the preceding expression with a conversion of it.
    const placeholder = TypePlaceholder.make();
    const newSource = source.replace(
        precedingExpression,
        Convert.make(precedingExpression, placeholder),
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
        ((!caret.isInsideWords() &&
            (!FormattingSymbols.includes(text) ||
                // Allow the elision symbol, since it can be completed outside of words.
                text === ELISION_SYMBOL)) ||
            (caret.isInsideWords() && FormattingSymbols.includes(text))) &&
        (caret.tokenPrior === undefined ||
            // The text typed does not close an unmatched delimiter
            (caret.source.getUnmatchedDelimiter(caret.tokenPrior, text) ===
                undefined &&
                !(
                    // The token prior is text or unknown
                    (
                        caret.tokenPrior.isSymbol(Sym.Text) ||
                        caret.tokenPrior.isSymbol(Sym.Unknown)
                    )
                )))
    ) {
        let newPosition: Node | number = position;
        let newSource = source;

        const preceding = getPrecedingExpression(source, position, false).map(
            (node) => ({
                expression: node,
                type: node.getType(project.getNodeContext(node)),
            }),
        );
        const precedingList = preceding.filter(
            (preceding) => preceding.type instanceof ListType,
        )[0]?.expression;
        const precedingSet = preceding.filter(
            (preceding) =>
                preceding.type instanceof SetType ||
                preceding.type instanceof MapType,
        )[0]?.expression;

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
            );
            if (newSource) return [newSource, placeholder];
        } else if (precedingSet) {
            const placeholder = ExpressionPlaceholder.make();
            const newSource = source.replace(
                precedingSet,
                SetOrMapAccess.make(precedingSet, placeholder),
            );
            if (newSource) return [newSource, placeholder];
        } else {
            text += DelimiterCloseByOpen[text];
            newSource = source.withGraphemesAt(text, position) ?? newSource;
            if (newSource) return [newSource, position + 1];
        }
    }
    return undefined;
}

function completeStream({
    source,
    position,
}: InsertInfo): Revision | undefined {
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
 * If the inserted character is an operator, see if we can construct a binary evaluation with the
 * preceding expression and a placeholder on the right.
 */
function completeBinaryEvaluate({
    text,
    source,
    position,
    project,
}: InsertInfo): Revision | undefined {
    // Find the top most expression that ends where the caret is.
    const precedingExpression = getPrecedingExpression(
        source,
        position,
        false,
    ).filter(
        (node): node is Expression =>
            node instanceof Expression &&
            !(node instanceof Program) &&
            !(node instanceof Source) &&
            !(node instanceof Block && node.isRoot()),
    )[0];

    if (
        precedingExpression instanceof NumberLiteral &&
        !precedingExpression.unit?.isEmpty() &&
        (text === PRODUCT_SYMBOL || text === EXPONENT_SYMBOL)
    )
        return undefined;

    if (
        precedingExpression &&
        precedingExpression
            .getType(project.getNodeContext(precedingExpression))
            .getDefinitionOfNameInScope(
                text,
                project.getNodeContext(precedingExpression),
            ) !== undefined
    ) {
        const binary = new BinaryEvaluate(
            precedingExpression instanceof Literal ||
                precedingExpression instanceof Reference
                ? precedingExpression
                : Block.make([precedingExpression]),
            new Reference(tokens(text)[0]),
            ExpressionPlaceholder.make(),
        );
        // Make a new source
        const newSource = source.replace(precedingExpression, binary);
        // Place the caret on the placeholder
        const newPosition = binary.right;
        if (newSource) return [newSource, newPosition];
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
    );
    // Place the caret on the placeholder
    if (newSource !== source) return [newSource, placeholder];
}

/** On a :, complete a Bind or KeyValue */
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

    const placeholder = ExpressionPlaceholder.make(
        preceding instanceof Is ? preceding.type : undefined,
    );
    const bind = Bind.make(
        undefined,
        Names.make([reference.name.getText()]),
        preceding instanceof Is ? preceding.type.clone() : undefined,
        placeholder,
    );
    // Make a new source
    const newSource = source.replace(preceding, bind);
    // Place the caret on the placeholder
    if (newSource !== source) return [newSource, placeholder];
}

/** Complete a web link inside a paragraph */
function completeLink(info: InsertInfo): Revision | undefined {
    return completeMarkup(info, WebLink.make('', 'https://'));
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
    );

    if (newSource !== source) return [newSource, position + 1];

    return undefined;
}
