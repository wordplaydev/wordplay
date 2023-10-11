import type { Edit, Revision } from '../components/editor/util/Commands';
import Block from '@nodes/Block';
import Node, { ListOf } from '@nodes/Node';
import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
import {
    DelimiterCloseByOpen,
    FormattingSymbols,
    DelimiterOpenByClose,
    TextOpenByTextClose,
} from '@parser/Tokenizer';
import {
    CONVERT_SYMBOL,
    PROPERTY_SYMBOL,
    STREAM_SYMBOL,
} from '@parser/Symbols';
import type Source from '@nodes/Source';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Program from '@nodes/Program';
import UnicodeString from '../models/UnicodeString';
import ListLiteral from '@nodes/ListLiteral';
import SetLiteral from '../nodes/SetLiteral';
import MapLiteral from '../nodes/MapLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import BooleanLiteral from '../nodes/BooleanLiteral';
import type Literal from '../nodes/Literal';
import concretize from '../locale/concretize';
import type Context from '../nodes/Context';
import type Type from '../nodes/Type';
import type LanguageCode from '../locale/LanguageCode';
import NodeRef from '../locale/NodeRef';
import type Conflict from '../conflicts/Conflict';
import Translation from '../nodes/Translation';
import { LanguageTagged } from '../nodes/LanguageTagged';

export type InsertionContext = { before: Node[]; after: Node[] };
export type CaretPosition = number | Node;
export type Entry = 'previous' | 'next' | undefined;

export default class Caret {
    readonly source: Source;
    readonly position: CaretPosition;
    /** The latest column of the caret in the code with preferred spacing */
    readonly column: number;
    readonly entry: Entry;
    // The node recently added.
    readonly addition: Node | undefined;

    // A cache of the token we're at, since we use it frequently.
    readonly tokenIncludingSpace: Token | undefined;
    readonly tokenPrior: Token | undefined;
    readonly tokenSpaceIndex: number | undefined;
    readonly tokenExcludingSpace: Token | undefined;

    constructor(
        source: Source,
        position: CaretPosition,
        column: number | undefined,
        entry: Entry,
        addition: Node | undefined
    ) {
        this.source = source;
        this.position = position;
        // No column provided? Compute it from the position. Otherwise set it.
        this.column =
            column === undefined
                ? typeof position === 'number'
                    ? this.source.getColumn(position) ?? 0
                    : 0
                : column;

        this.entry = entry;
        this.addition = addition;

        this.tokenIncludingSpace =
            typeof this.position === 'number'
                ? this.source.getTokenAt(this.position)
                : undefined;
        this.tokenPrior =
            typeof this.position === 'number'
                ? this.source.getTokenAt(this.position - 1)
                : undefined;
        this.tokenSpaceIndex =
            this.tokenIncludingSpace === undefined
                ? undefined
                : this.source.getTokenSpacePosition(this.tokenIncludingSpace);
        this.tokenExcludingSpace =
            typeof this.position === 'number'
                ? this.source.getTokenAt(this.position, false)
                : undefined;
    }

    getTokenPrior() {
        return this.tokenPrior;
    }

    getTokensPrior() {
        return this.tokenIncludingSpace
            ? this.source.getTokensBefore(this.tokenIncludingSpace)
            : undefined;
    }

    atBeginningOfTokenSpace() {
        return this.tokenSpaceIndex === this.position;
    }

    atTokenStart() {
        return (
            this.tokenIncludingSpace &&
            this.source.getTokenTextPosition(this.tokenIncludingSpace) ===
                this.position
        );
    }

    insideToken() {
        if (
            this.tokenExcludingSpace === undefined ||
            this.position instanceof Node
        )
            return false;
        const start = this.source.getTokenTextPosition(
            this.tokenExcludingSpace
        );
        const end = this.source.getTokenLastPosition(this.tokenExcludingSpace);
        return (
            start !== undefined &&
            end !== undefined &&
            this.position > start &&
            this.position < end
        );
    }

    atTokenEnd() {
        return (
            this.tokenPrior &&
            this.source.getTokenLastPosition(this.tokenPrior) === this.position
        );
    }

    getAdjustableLiteral(): Literal | undefined {
        const node =
            this.position instanceof Node
                ? this.position
                : this.tokenExcludingSpace;
        if (node) {
            return this.source.root
                .getSelfAndAncestors(node)
                .find(
                    (literal): literal is NumberLiteral | BooleanLiteral =>
                        (literal instanceof Translation &&
                            literal.getText().length === 1) ||
                        literal instanceof NumberLiteral ||
                        literal instanceof BooleanLiteral
                );
        }
        return undefined;
    }

    betweenDelimiters() {
        const start =
            this.tokenExcludingSpace === undefined
                ? undefined
                : this.source.getTokenTextPosition(this.tokenExcludingSpace);
        const end =
            this.tokenExcludingSpace === undefined
                ? undefined
                : this.source.getTokenLastPosition(this.tokenExcludingSpace);
        return (
            start !== undefined &&
            end !== undefined &&
            typeof this.position === 'number' &&
            this.position > start &&
            this.position < end
        );
    }

    getCode() {
        return this.source.getCode();
    }

    getProgram() {
        return this.source.expression;
    }

    getToken(): Token | undefined {
        return this.tokenIncludingSpace;
    }

    getTokenExcludingSpace(): Token | undefined {
        return this.tokenExcludingSpace;
    }

    tokenAtHasPrecedingSpace(): boolean {
        return (
            this.tokenIncludingSpace !== undefined &&
            this.source.spaces.getSpace(this.tokenIncludingSpace).length > 0
        );
    }

    hasSpaceAfter(): boolean {
        if (this.tokenIncludingSpace === undefined) return false;
        const next = this.atTokenEnd()
            ? this.tokenIncludingSpace
            : this.source.getTokenAfterNode(
                  this.position instanceof Node
                      ? this.position
                      : this.tokenIncludingSpace
              );
        if (next === undefined) return false;
        return this.source.spaces.getSpace(next).length > 0;
    }

    isEmptyLine() {
        return (
            typeof this.position === 'number' &&
            this.source.isEmptyLine(this.position)
        );
    }

    getNodesBetween() {
        const empty = { before: [], after: [] };

        // If the caret is a node, there is no notion of between.
        if (
            this.position instanceof Node ||
            this.tokenIncludingSpace === undefined
        )
            return empty;

        // Get the line number of the position.
        const lineNumber = this.source.getLine(this.position);
        if (lineNumber === undefined) return empty;

        const emptyLine = this.isEmptyLine();

        // If it's an index, then we want to find all of the nodes that could insert something at this position,
        // so we can make suggestions about what to put there. For example, consider this code and caret position.
        //
        // name|: 5
        //
        // This has the syntax tree
        // BIND
        //      docs []
        //      etc -
        //      aliases: [
        //          ALIAS
        //              semicolon -
        //              name TOKEN [ "name" ]
        //              lang -
        //      ]
        //      dot -
        //      type -
        //      colon: TOKEN
        //      expression: MEASUREMENT_LITERAL
        //
        // The caret is between the alias and the colon. Based on the grammar, we could insert
        //  • More characters on the right of the name
        //  • A LANGUAGE for the alias
        //  • Another ALIAS after this one
        //  • A type symbol and type after the ALIAS list
        //
        // What's an algorithm that can determine all of these possibilities?
        // Basically, we take the position, find the token that contains it,
        // and find all of the ancestors of that token whose first and last token index contain the position.
        // All of those nodes could possibly insert something.
        //
        // In the example above, the token that contains the index is the TOKEN,
        // and its ancestors ALIAS and BIND contain it. But other code before and after the BIND do not contain it.
        //
        // Then, each of ALIAS and BIND would take the child the position is after as input, and offer recommendations
        // of insertions. For example, ALIAS would get TOKEN as the node after, and then deduce from that that LANG
        // is the only possible insertion, then offer possible languages. Then BIND would get the ALIAS as the node after,
        // and deduce that it could insert another ALIAS, or a type and type symbol.
        // All of this logic would have to be in nodes, since only the nodes (and the grammar) know what insertions are valid.

        // Find the token whose space contains the current position. This is the token text to the right of the caret.
        const tokens = this.getProgram()
            .nodes()
            .filter((token) => token instanceof Token) as Token[];
        const tokenAfter = this.source.getTokenWithSpaceAt(this.position);

        if (tokenAfter === undefined) return empty;

        // Find the token before the caret
        const tokenBefore =
            tokens[0] === tokenAfter
                ? undefined
                : tokens[tokens.indexOf(tokenAfter) - 1];

        // Make a list of parent/child nodes that are adjacent to the caret.
        const pairs: InsertionContext = {
            before: [],
            after: [],
        };

        // Start with the token after and find all nodes that contain this token's space.
        let node: Node | undefined | null = tokenAfter;
        while (node instanceof Node) {
            const firstToken = this.source.getFirstToken(node);
            if (
                firstToken === undefined ||
                !this.source.tokenSpaceContains(firstToken, this.position)
            )
                break;
            const parent: Node | undefined = this.source.root.getParent(node);
            if (
                parent &&
                (this.source.getLine(node) === lineNumber ||
                    (parent instanceof Block && emptyLine))
            )
                pairs.after.push(node);
            node = parent;
        }

        // Start with the token before and find all of the ancestors for which the token before is the last token in the node.
        if (tokenBefore !== undefined) {
            let node: Node | undefined | null = tokenBefore;
            while (node instanceof Node) {
                const parent: Node | undefined =
                    this.source.root.getParent(node);
                const nodeLineNumber = this.source.getLine(node);
                if (
                    nodeLineNumber === lineNumber ||
                    (parent instanceof Block && emptyLine)
                ) {
                    const nodesTokens = node.nodes(
                        (t): t is Token => t instanceof Token
                    );
                    if (
                        parent &&
                        nodesTokens.length > 0 &&
                        nodesTokens[nodesTokens.length - 1] === tokenBefore
                    )
                        pairs.before.push(node);
                }
                node = parent;
            }
        }

        return pairs;
    }

    isEnd() {
        return (
            this.isIndex() &&
            this.position === this.source.getCode().getLength()
        );
    }

    isIndex() {
        return typeof this.position === 'number';
    }

    getIndex() {
        return this.isIndex() ? (this.position as number) : undefined;
    }

    isSpace(c: string) {
        return /[\t\n ]/.test(c);
    }

    isTab(c: string) {
        return /[\t]/.test(c);
    }

    isNode() {
        return this.position instanceof Node;
    }

    isAtPropertyReference() {
        if (this.position instanceof Node) return false;
        return this.source.getCode().at(this.position - 1) === PROPERTY_SYMBOL;
    }

    /** True if this caret's position is or is inside of the given node. */
    isIn(node: Node, includeEnd: boolean) {
        if (this.position instanceof Node)
            return (
                this.position === node ||
                this.source.root.hasAncestor(this.position, node)
            );

        const start = this.source.getNodeFirstPosition(node);
        const end = this.source.getNodeLastPosition(node);
        return (
            start !== undefined &&
            end !== undefined &&
            start <= this.position &&
            (includeEnd ? this.position <= end : this.position < end)
        );
    }

    // Get the code position corresponding to the beginning of the given row.
    rowPosition(row: number): number | undefined {
        const lines = this.source.getCode().getLines();
        if (row < 0 || row >= lines.length) return undefined;
        let rowPosition = 0;
        for (let i = 0; i < row; i++) rowPosition += lines[i].getLength() + 1;
        return rowPosition;
    }

    left(sibling: boolean): Caret {
        return this.moveInline(sibling, -1);
    }
    right(sibling: boolean): Caret {
        return this.moveInline(sibling, 1);
    }

    nextNewline(direction: -1 | 1): Caret | undefined {
        if (typeof this.position !== 'number') return undefined;
        let pos = this.position;
        while (pos >= 0 && pos < this.source.getCode().getLength()) {
            pos += direction;
            if (this.source.getCode().at(pos) === '\n') break;
        }
        return this.withPosition(
            Math.min(Math.max(0, pos), this.source.getCode().getLength())
        );
    }

    moveInline(sibling: boolean, direction: -1 | 1): Caret {
        // Map the direction onto an entry direction.
        const entry = direction > 0 ? 'next' : 'previous';
        if (this.position instanceof Node) {
            // If sibling, then find the parent of the current node and choose it's sibling.
            // If there's no sibling in this direction, then do nothing.
            if (sibling) {
                const children = this.source.root
                    .getParent(this.position)
                    ?.getChildren();
                if (children === undefined) return this;
                const sibling =
                    children[children.indexOf(this.position) + direction];
                return sibling
                    ? this.withPosition(sibling, this.column, entry)
                    : this;
            }
            // If requesting the non-sibling, get the token after/before the current selection
            // in the depth first traversal of the search.
            else {
                // If there's an entry point, choose the corresponding next position to preserve a sense of directionality.
                // Otherwise, choose the first or last token of the currently selected node, moving before or past it.
                let start: boolean;
                let offset = 0;
                if (this.entry === undefined) start = direction < 0;
                else {
                    if (this.entry === 'next') {
                        if (entry === 'next') {
                            start = true;
                            offset = 1;
                        } else {
                            start = true;
                            offset = 0;
                        }
                    } else {
                        if (entry === 'next') {
                            start = false;
                            offset = 0;
                        } else {
                            start = false;
                            offset = -1;
                        }
                    }
                }

                const index = this.getTextPosition(start, offset);
                return index !== undefined
                    ? this.withPosition(index, this.column, entry)
                    : this;
            }
        } else {
            // At the beginning or end? Do nothing.
            if (
                this.position ===
                (direction < 0 ? 0 : this.source.getCode().getLength())
            )
                return this;

            // At a token start and going next? Select the token.
            const token = this.source.getTokenAt(this.position, false);
            const tokenBefore = this.source.getTokenAt(
                this.position - 1,
                false
            );
            if (
                token &&
                direction > 0 &&
                this.source.getTokenTextPosition(token) === this.position
            )
                return this.withPosition(
                    this.getParentOfOnlyChild(token),
                    this.column,
                    entry
                );
            else if (
                tokenBefore &&
                direction < 0 &&
                this.source.getTokenLastPosition(tokenBefore) === this.position
            )
                return this.withPosition(
                    this.getParentOfOnlyChild(tokenBefore),
                    this.column,
                    entry
                );

            return this.withPosition(
                this.position + direction,
                this.source.getColumn(this.position + direction),
                entry
            );
        }
    }

    atLineBoundary(start: boolean): Caret {
        let position =
            this.position instanceof Node
                ? this.source.getNodeFirstPosition(this.position)
                : this.position;
        if (position === undefined) return this;
        if (start) {
            if (this.source.code.at(position - 1) === '\n') return this;
            do {
                position--;
                if (this.source.code.at(position) === '\n')
                    return this.withPosition(position + 1);
            } while (position > 0);
            return this.withPosition(0);
        } else {
            if (this.source.code.at(position) === '\n') return this;
            do {
                position++;
                if (this.source.code.at(position) === '\n')
                    return this.withPosition(position);
            } while (position < this.source.code.getLength());
            return this.withPosition(this.source.code.getLength() - 1);
        }
    }

    getParentOfOnlyChild(token: Token): Node {
        const parent = this.source.root.getParent(token);
        const tokens = parent?.leaves();
        return parent && tokens && tokens.length === 1 && tokens[0] === token
            ? parent
            : token;
    }

    getTextPosition(start: boolean, offset = 0): number | undefined {
        if (this.position instanceof Node) {
            // Get the first or last token of the given node.
            const tokens = this.position.nodes(
                (n): n is Token => n instanceof Token
            ) as Token[];
            const first = tokens[0];
            const last = tokens[tokens.length - 1];
            if (start && first) {
                const index = this.source.getTokenTextPosition(first);
                if (index !== undefined) return index + offset;
            } else if (!start && last) {
                const index = this.source.getTokenTextPosition(last);
                if (index !== undefined)
                    return index + last.getTextLength() + offset;
            }
            return undefined;
        } else return undefined;
    }

    getPlaceholderAtPosition(position: number): Node | undefined {
        // Get the token at the position.
        const tokenAtPosition = this.source.getTokenAt(position, false);
        if (tokenAtPosition === undefined) return undefined;
        // If the token is a placeholder token, get the placeholder ancestor it's in.
        if (tokenAtPosition.isSymbol(Sym.Placeholder))
            return this.source.root
                .getAncestors(tokenAtPosition)
                .find((a) => a.isPlaceholder());
        else return undefined;
    }

    withPosition(
        position: number | Node,
        column?: number,
        entry?: Entry
    ): Caret {
        if (typeof position === 'number' && isNaN(position))
            throw Error('NaN on caret set!');
        return new Caret(
            this.source,
            typeof position === 'number'
                ? Math.max(
                      0,
                      Math.min(position, this.source.getCode().getLength())
                  )
                : position,
            // If given a column set it, otherwise keep the old one.
            column ?? this.column,
            entry ?? this.entry,
            this.addition
        );
    }

    withSource(source: Source) {
        return new Caret(
            source,
            this.position,
            this.column,
            this.entry,
            this.addition
        );
    }

    withAddition(addition: Node | undefined) {
        return new Caret(
            this.source,
            this.position,
            this.column,
            this.entry,
            addition
        );
    }

    withoutAddition() {
        return new Caret(
            this.source,
            this.position,
            this.column,
            this.entry,
            undefined
        );
    }

    insertNode(node: Node, offset: number): Edit | undefined {
        if (this.position instanceof Node) {
            const position = this.source.getNodeFirstPosition(this.position);
            if (position === undefined) return undefined;

            const newSource = this.source.replace(this.position, node);
            return [
                newSource,
                new Caret(
                    newSource,
                    position + offset,
                    this.column,
                    undefined,
                    node
                ),
            ];
        } else {
            const position = this.position;
            if (position === undefined) return;
            const newSource = this.source.withGraphemesAt(
                node.toWordplay(),
                position
            );
            if (newSource === undefined) return undefined;

            return [
                newSource,
                new Caret(
                    newSource,
                    position + offset,
                    this.column,
                    undefined,
                    newSource.getTokenAt(position)
                ),
            ];
        }
    }

    /** If complete is true, will automatically close a delimited symbol. */
    insert(text: string, complete = true): Edit | undefined {
        // Normalize the mystery string, ensuring it follows Unicode normalization form.
        text = text.normalize();

        let newSource: Source | undefined;
        let newPosition: number;
        let originalPosition: number;

        // Before doing insertion, see if a node is selected, and if so, remove it.
        if (this.position instanceof Node) {
            // Try wrapping the node
            const wrap = this.wrap(text);
            if (wrap !== undefined) return wrap;

            // If that didn't do anything, try deleting the node.
            const edit = this.deleteNode(this.position);
            if (edit === undefined) return;
            const [source, caret] = edit;
            if (caret.position instanceof Node) return;

            // Great, we have a new position.
            newSource = source;
            newPosition = caret.position;
            originalPosition = caret.position;
        } else {
            newSource = this.source;
            newPosition = this.position;
            originalPosition = this.position;
        }

        // Now, let's insert some text at the new position.

        // If the inserted string matches a single matched delimiter, complete it, unless:
        // 1) we’re immediately before an matched closing delimiter, in which case we insert nothing, but move the caret forward
        // 2) the character being inserted closes an unmatched delimiter, in which case we just insert the character.
        // const closed = text in DELIMITERS;
        // if(closed) {

        let closed = false;

        // If the character we're inserting is already immediately after the caret and is a matched closing deimiter, don't insert, just move the caret forward.
        // We handle two cases: discrete matched tokens ([], {}, ()) text tokens that have internal matched delimiters.
        if (
            this.tokenIncludingSpace &&
            // Is what's being typed a closing delimiter?
            text in DelimiterOpenByClose &&
            // Is the text being typed what's already there?
            text === this.source.code.at(newPosition) &&
            // Is what's being typed a closing delimiter of a text literal?
            ((this.tokenIncludingSpace.isSymbol(Sym.Text) &&
                TextOpenByTextClose[
                    this.tokenIncludingSpace.getText().charAt(0)
                ] === text) ||
                // Is what's being typed a closing delimiter of an open delimiter?
                (this.tokenIncludingSpace.getText() in DelimiterOpenByClose &&
                    this.source.getMatchedDelimiter(
                        this.tokenIncludingSpace
                    ) !== undefined))
        )
            return [
                this.source,
                new Caret(
                    this.source,
                    newPosition + 1,
                    undefined,
                    undefined,
                    undefined
                ),
            ];
        // Otherwise, if the text to insert is an opening delimiter and this isn't an unclosed text delimiter, automatically insert its closing counterpart.
        else if (
            complete &&
            text in DelimiterCloseByOpen &&
            ((!this.isInsideText() && !FormattingSymbols.includes(text)) ||
                (this.isInsideText() && FormattingSymbols.includes(text))) &&
            (this.tokenPrior === undefined ||
                // The text typed does not close an unmatched delimiter
                (this.source.getUnmatchedDelimiter(this.tokenPrior, text) ===
                    undefined &&
                    !(
                        // The token prior is text or unknown
                        (
                            this.tokenPrior.isSymbol(Sym.Text) ||
                            this.tokenPrior.isSymbol(Sym.Unknown)
                        )
                    )))
        ) {
            closed = true;
            text += DelimiterCloseByOpen[text];
        }
        // If the two preceding characters are dots and this is a dot, delete the last two dots then insert the stream symbol.
        else if (
            text === '.' &&
            newSource.getGraphemeAt(newPosition - 1) === '.' &&
            newSource.getGraphemeAt(newPosition - 2) === '.'
        ) {
            text = STREAM_SYMBOL;
            newSource = newSource
                .withoutGraphemeAt(newPosition - 2)
                ?.withoutGraphemeAt(newPosition - 2);
            newPosition = newPosition - 2;
        }
        // If the preceding character is an arrow dash, delete the dash and insert the arrow
        else if (
            text === '>' &&
            newSource.getGraphemeAt(newPosition - 1) === '-'
        ) {
            text = CONVERT_SYMBOL;
            newSource = newSource.withoutGraphemeAt(newPosition - 1);
            newPosition = newPosition - 1;
        }

        // Did we somehow get no source?
        if (newSource === undefined) return undefined;

        newSource = newSource.withGraphemesAt(text, newPosition);

        // Did we somehow get no source?
        if (newSource === undefined) return undefined;

        // What's the new token we added?
        const newToken = newSource.getTokenAt(originalPosition, false);

        newPosition =
            newPosition + (closed ? 1 : new UnicodeString(text).getLength());

        return [
            newSource,
            new Caret(newSource, newPosition, undefined, undefined, newToken),
        ];
    }

    isInsideText() {
        const isText =
            this.tokenExcludingSpace !== undefined &&
            this.tokenExcludingSpace.isSymbol(Sym.Words);
        const isAfterText =
            this.tokenPrior && this.tokenPrior.isSymbol(Sym.Words);
        return (isText && !this.betweenDelimiters()) || isAfterText;
    }

    isPlaceholderNode() {
        return this.position instanceof Node && this.position.isPlaceholder();
    }

    isPlaceholderToken() {
        return (
            this.position instanceof Token &&
            this.position.isSymbol(Sym.Placeholder)
        );
    }

    /** If the caret is a node, set the position to its first index */
    enter() {
        if (this.position instanceof Node) {
            // Token? Set a position.
            if (this.position instanceof Token) {
                const index = this.source.getTokenTextPosition(this.position);
                return index !== undefined
                    ? this.withPosition(index + 1)
                    : this;
            }
            // Not a token? Choose the first, child, unless there's only one child and it's a token.
            else {
                const children = this.position.getChildren();
                const leaves = this.position.leaves();
                const first = children[0];
                if (first === undefined) return this;
                if (first instanceof Token && leaves.length === 1) {
                    const index = this.source.getTokenTextPosition(first);
                    return index !== undefined
                        ? this.withPosition(index + 1)
                        : this;
                } else
                    return this.withPosition(
                        this.position.getChildren()[0] ?? this.position
                    );
            }
        } else return this;
    }

    getRange(node: Node): [number, number] | undefined {
        const tokens = node.nodes((t): t is Token => t instanceof Token);
        const first = tokens[0];
        const last = tokens[tokens.length - 1];
        const firstIndex = this.source.getTokenTextPosition(first);
        const lastIndex = this.source.getTokenLastPosition(last);
        return firstIndex === undefined || lastIndex === undefined
            ? undefined
            : [firstIndex, lastIndex];
    }

    replace(old: Node, replacement: string): Edit | undefined {
        const range = this.getRange(old);
        if (range === undefined) return;
        const newCode = replacement;

        const newSource = this.source
            .withoutGraphemesBetween(range[0], range[1])
            ?.withGraphemesAt(newCode, range[0]);

        if (newSource === undefined) return;

        const newPosition = range[0] + newCode.length;

        return [
            newSource,
            new Caret(
                newSource,
                newPosition,
                undefined,
                undefined,
                newSource.getTokenAt(newPosition)
            ),
        ];
    }

    backspace(): Edit | undefined {
        if (typeof this.position === 'number') {
            const before = this.source.getCode().at(this.position - 1);
            const after = this.source.getCode().at(this.position);

            // Is this just after a placeholder? Delete the whole placeholder.
            const placeholder = this.getPlaceholderAtPosition(
                this.position - 1
            );
            if (placeholder) return this.deleteNode(placeholder);

            if (before && after && DelimiterCloseByOpen[before] === after) {
                // If there's an adjacent pair of delimiters, delete them both.
                let newSource = this.source.withoutGraphemeAt(this.position);
                if (newSource)
                    newSource = newSource.withoutGraphemeAt(this.position - 1);
                return newSource === undefined
                    ? undefined
                    : [
                          newSource,
                          new Caret(
                              newSource,
                              Math.max(0, this.position - 1),
                              undefined,
                              undefined,
                              undefined
                          ),
                      ];
            } else {
                const newSource = this.source.withoutGraphemeAt(
                    this.position - 1
                );
                return newSource === undefined
                    ? undefined
                    : [
                          newSource,
                          new Caret(
                              newSource,
                              Math.max(0, this.position - 1),
                              undefined,
                              undefined,
                              undefined
                          ),
                      ];
            }
        }
        // If it's a node, replace it with a placeholder, or delete it.
        else {
            // Get the parent of the node.
            const node = this.position;
            const parent = this.source.root.getParent(node);

            // Is the parent a wrapper? Unwrap it.
            if (
                parent instanceof Block &&
                !parent.isRoot() &&
                parent.statements.length === 1
            ) {
                return [
                    this.source.replace(parent, parent.statements[0]),
                    this.withPosition(parent.statements[0]),
                ];
            }
            // Is the parent a list with on element? Unwrap the list.
            else if (
                (parent instanceof ListLiteral ||
                    parent instanceof SetLiteral ||
                    parent instanceof MapLiteral) &&
                parent.values.length === 1
            ) {
                return [
                    this.source.replace(parent, parent.values[0]),
                    this.withPosition(parent.values[0]),
                ];
            }
            // Other grammar-dependent cases.
            else {
                const kind = parent?.getFieldOfChild(node)?.kind;
                const index = this.source.getNodeFirstPosition(node);
                const last = this.source.getNodeLastPosition(node);
                if (kind && index !== undefined) {
                    // If in a list or undefined is allowed, just remove it
                    if (
                        kind instanceof ListOf &&
                        kind.allowsUnconditionalNone()
                    ) {
                        return [
                            this.source.replace(node, undefined),
                            this.withPosition(index).withAddition(undefined),
                        ];
                    }
                    // If it allows a program, replace it with a program.
                    else if (kind.allowsKind(Program)) {
                        return [
                            this.source.replace(node, Program.make()),
                            this.withPosition(index).withAddition(undefined),
                        ];
                    }
                    // Is the parent an expression with a single token and its field accepts expressions? Replace the parent.
                    else if (
                        kind.allowsKind(Expression) &&
                        parent instanceof Expression &&
                        node instanceof Token &&
                        parent.leaves().length === 1
                    ) {
                        const placeholder = ExpressionPlaceholder.make();
                        return [
                            this.source.replace(
                                parent,
                                ExpressionPlaceholder.make()
                            ),
                            this.withPosition(placeholder).withAddition(
                                undefined
                            ),
                        ];
                    }
                    // If allows an expression, replace it with an expression placeholder.
                    else if (kind.allowsKind(Expression)) {
                        const placeholder = ExpressionPlaceholder.make();
                        return [
                            this.source.replace(node, placeholder),
                            this.withPosition(placeholder).withAddition(
                                undefined
                            ),
                        ];
                    }
                    // Otherwise, delete the sequence of characters.
                    else if (last !== undefined) {
                        const newSource = this.source.withoutGraphemesBetween(
                            index,
                            last
                        );
                        return newSource === undefined
                            ? undefined
                            : [
                                  newSource,
                                  new Caret(
                                      newSource,
                                      index,
                                      undefined,
                                      undefined,
                                      undefined
                                  ),
                              ];
                    }
                }
            }
            // Otherwise, do nothing.
        }
    }

    deleteNode(node: Node): Revision | undefined {
        const range = this.getRange(node);
        if (range === undefined) return;
        const newSource = this.source.withoutGraphemesBetween(
            range[0],
            range[1]
        );
        return newSource === undefined
            ? undefined
            : [
                  newSource,
                  new Caret(
                      newSource,
                      range[0],
                      undefined,
                      undefined,
                      undefined
                  ),
              ];
    }

    moveVertical(direction: 1 | -1): Edit | undefined {
        if (this.position instanceof Node) {
            const position = this.source.getNodeFirstPosition(this.position);
            if (position === undefined) return;
            return this.getVertical(direction, position);
        } else return this.getVertical(direction, this.position);
    }

    getVertical(direction: 1 | -1, position: number): Caret | undefined {
        // Get the current rendered line and column. Iterate through the tokens, and along the way, tracking the physical position and rendered position.
        // When we find the physical position, we'll have the rendered line and column.
        const match =
            this.source.getRenderedLineAndColumnFromPhysicalPosition(position);
        if (match === undefined) return;
        const [line] = match;
        const newLine = line + direction;

        const newPosition = this.source.getPhysicalPositionFromLineAndColumn(
            newLine,
            this.column
        );

        return newPosition !== undefined
            ? this.withPosition(newPosition, this.column)
            : undefined;
    }

    wrap(key: string): Edit | undefined {
        let node = this.position instanceof Node ? this.position : undefined;
        if (node instanceof Token && !node.isSymbol(Sym.End))
            node = this.source.root.getParent(node);
        if (node === undefined || !(node instanceof Expression))
            return undefined;
        const wrapper =
            node === undefined
                ? undefined
                : key === '('
                ? Block.make([node])
                : key === '['
                ? ListLiteral.make([node])
                : undefined;
        if (wrapper === undefined) return undefined;

        const newSource = this.source.replace(node, wrapper);
        return [newSource, this.withSource(newSource).withAddition(wrapper)];
    }

    adjustLiteral(node: Node | undefined, direction: -1 | 1): Edit | undefined {
        // Find the token we're at
        const token = node
            ? node
            : typeof this.position === 'number'
            ? this.tokenExcludingSpace ?? this.tokenPrior
            : this.position;

        if (token === undefined) return;

        const ancestors = [token, ...this.source.root.getAncestors(token)];
        for (const ancestor of ancestors) {
            const revision = ancestor.adjust(direction);
            if (revision) {
                const newSource = this.source.replace(ancestor, revision);
                return [
                    newSource,
                    this.withPosition(revision)
                        .withSource(newSource)
                        .withAddition(revision),
                ];
            }
        }
    }

    getDescription(
        type: Type | undefined,
        conflicts: Conflict[],
        context: Context
    ): string {
        const locale = context.getBasis().locales[0];

        /** Get description of conflicts */
        const conflictDescription =
            conflicts.length > 0
                ? concretize(
                      locale,
                      locale.ui.edit.conflicts,
                      conflicts.length
                  ).toText()
                : undefined;

        return `${this.getPositionDescription(type, context)}${
            conflictDescription ? `, ${conflictDescription}` : ''
        }`;
    }

    getPositionDescription(type: Type | undefined, context: Context) {
        const locale = context.getBasis().locales[0];

        /** If the caret is a node, describe the node. */
        if (this.position instanceof Node) {
            return concretize(
                locale,
                locale.ui.edit.node,
                new NodeRef(this.position, locale, context),
                type ? new NodeRef(type, locale, context) : undefined
            ).toText();
        }

        const { before, after } = this.getNodesBetween();
        const beforeNode = before[0];
        const afterNode = after[0];

        if (this.tokenExcludingSpace && this.isInsideText()) {
            return concretize(
                locale,
                locale.ui.edit.inside,
                new NodeRef(this.tokenExcludingSpace, locale, context)
            ).toText();
        } else if (this.isEmptyLine()) {
            return concretize(
                locale,
                locale.ui.edit.line,
                beforeNode
                    ? new NodeRef(beforeNode, locale, context)
                    : undefined,
                afterNode ? new NodeRef(afterNode, locale, context) : undefined
            ).toText();
        } else if (this.tokenIncludingSpace) {
            if (this.tokenPrior && this.tokenPrior !== this.tokenIncludingSpace)
                return concretize(
                    locale,
                    locale.ui.edit.between,
                    beforeNode
                        ? new NodeRef(beforeNode, locale, context)
                        : undefined,
                    afterNode
                        ? new NodeRef(afterNode, locale, context)
                        : undefined
                ).toText();
            else
                return concretize(
                    locale,
                    locale.ui.edit.before,
                    afterNode
                        ? new NodeRef(afterNode, locale, context)
                        : undefined
                ).toText();
        }
    }

    /** Gets the language code of the current content, if a language tagged token, or inside one */
    getLanguage(): LanguageCode | undefined {
        if (this.position instanceof Node) return undefined;
        const token =
            this.tokenExcludingSpace ?? this.tokenIncludingSpace ?? undefined;
        if (token === undefined) return undefined;
        const ancestors = this.source.root.getAncestors(token);
        const text = ancestors.find(
            (a): a is LanguageTagged => a instanceof LanguageTagged
        );
        return text?.language?.getLanguageCode();
    }
}
