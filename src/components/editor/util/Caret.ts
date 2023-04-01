import type { Edit, Revision } from './Commands';
import Block from '@nodes/Block';
import Node from '@nodes/Node';
import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import {
    DELIMITERS,
    REVERSE_DELIMITERS,
    REVERSE_TEXT_DELIMITERS,
} from '@parser/Tokenizer';
import { PROPERTY_SYMBOL } from '@parser/Symbols';
import type Source from '@nodes/Source';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Program from '@nodes/Program';
import UnicodeString from '../../../models/UnicodeString';
import ListLiteral from '@nodes/ListLiteral';

export type InsertionContext = { before: Node[]; after: Node[] };
export type CaretPosition = number | Node;

export default class Caret {
    readonly time: number;
    readonly source: Source;
    readonly position: CaretPosition;
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
        addition: Node | undefined
    ) {
        this.time = Date.now();
        this.source = source;
        this.position = position;
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

    atTokenEnd() {
        return (
            this.tokenPrior &&
            this.source.getTokenLastPosition(this.tokenPrior) === this.position
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

        const emptyLine = this.source.isEmptyLine(this.position);

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

        // Find the line that

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
                pairs.before.push(node);
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
                    const nodesTokens = node.nodes((t) => t instanceof Token);
                    if (
                        parent &&
                        nodesTokens.length > 0 &&
                        nodesTokens[nodesTokens.length - 1] === tokenBefore
                    )
                        pairs.after.push(node);
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
    isIn(node: Node) {
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
            this.position <= end
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

    /* Compute the column of text the caret is at, if a number. */
    column() {
        if (typeof this.position === 'number') {
            let column = 0;
            let index = this.position;
            while (index > 0 && this.source.getCode().at(index) !== '\n') {
                index = index - 1;
                column = column + 1;
            }
            return Math.max(column - 1, 0);
        }
        return undefined;
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
                return sibling ? this.withPosition(sibling) : this;
            }
            // If requesting the non-sibling, get the token after/before the current selection
            // in the depth first traversal of the search.
            else {
                // Choose the first or last index of the node.

                // const nodes = this.source.nodes();
                // let currentIndex = nodes.indexOf(this.position);
                // if (currentIndex < 0) return this;
                // do {
                //     currentIndex += direction;
                //     if (currentIndex < 0 || currentIndex >= nodes.length)
                //         return this;
                //     const currentNode = nodes[currentIndex];
                //     if (currentNode instanceof Token)
                //         return this.withPosition(currentNode);
                // } while (this);
                // return this;

                // Get the first or last token of the given node.
                const index = this.getTextPosition(direction < 0);
                return index !== undefined ? this.withPosition(index) : this;
            }
        } else {
            // At the beginning or end? Do nothing.
            if (
                this.position ===
                (direction < 0 ? 0 : this.source.getCode().getLength())
            )
                return this;

            // At a placeholder? Select the placeholder.
            const placeholder = this.getPlaceholderAtPosition(
                this.position - (direction < 0 ? 1 : 0)
            );
            if (placeholder) return this.withPosition(placeholder);

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
                return this.withPosition(token);
            else if (
                tokenBefore &&
                direction < 0 &&
                this.source.getTokenLastPosition(tokenBefore) === this.position
            )
                return this.withPosition(tokenBefore);

            return this.withPosition(this.position + direction);
        }
    }

    getTextPosition(start: boolean): number | undefined {
        if (this.position instanceof Node) {
            // Get the first or last token of the given node.
            const tokens = this.position.nodes(
                (n): n is Token => n instanceof Token
            ) as Token[];
            const first = tokens[0];
            const last = tokens[tokens.length - 1];
            if (start && first) {
                return this.source.getTokenTextPosition(first);
            } else if (!start && last) {
                const index = this.source.getTokenTextPosition(last);
                if (index !== undefined) return index + last.getTextLength();
            }
            return undefined;
        } else return undefined;
    }

    getPlaceholderAtPosition(position: number): Node | undefined {
        const tokenAtPosition = this.source.getTokenAt(position, false);
        if (tokenAtPosition === undefined) return undefined;
        return this.source.root
            .getAncestors(tokenAtPosition)
            .find((a) => a.isPlaceholder());
    }

    moveNodeHorizontal(direction: -1 | 1) {
        if (this.position instanceof Node) {
            const nodes = this.source.nodes((node) => node instanceof Token);
            let index = nodes.indexOf(this.position);
            let next = nodes[index + direction];
            // while(next !== undefined && next instanceof Token) {
            //     index += direction;
            //     next = nodes[index + direction];
            // }
            return next === undefined ? this : this.withPosition(next);
        } else return this;
    }

    withPosition(position: number | Node): Caret {
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
            this.addition
        );
    }

    withSource(source: Source) {
        return new Caret(source, this.position, this.addition);
    }

    withAddition(addition: Node | undefined) {
        return new Caret(this.source, this.position, addition);
    }

    withoutAddition() {
        return new Caret(this.source, this.position, undefined);
    }

    insertNode(node: Node, offset: number): Edit | undefined {
        if (this.position instanceof Node) {
            const position = this.source.getNodeFirstPosition(this.position);
            if (position === undefined) return undefined;

            const newSource = this.source.replace(this.position, node);
            return [newSource, new Caret(newSource, position + offset, node)];
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
                    newSource.getTokenAt(position)
                ),
            ];
        }
    }

    insert(text: string): Edit | undefined {
        // Normalize the mystery string, ensuring it follows Unicode normalization form.
        text = text.normalize();

        if (typeof this.position === 'number') {
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
                text in REVERSE_DELIMITERS &&
                // Is the text being typed what's already there?
                text === this.source.code.at(this.position) &&
                // Is what's being typed a closing delimiter of a text literal?
                ((this.tokenIncludingSpace.is(TokenType.Text) &&
                    REVERSE_TEXT_DELIMITERS[
                        this.tokenIncludingSpace.getText().charAt(0)
                    ] === text) ||
                    // Is what's being typed a closing delimiter of an open delimiter?
                    (this.tokenIncludingSpace.getText() in REVERSE_DELIMITERS &&
                        this.source.getMatchedDelimiter(
                            this.tokenIncludingSpace
                        ) !== undefined))
            )
                return [
                    this.source,
                    new Caret(this.source, this.position + 1, undefined),
                ];
            // Otherwise, if the text to insert is an opening delimiter and this isn't an unclosed text delimiter, automatically insert its closing counterpart.
            else if (
                text in DELIMITERS &&
                (this.tokenPrior === undefined ||
                    !(
                        (this.tokenPrior.is(TokenType.Text) ||
                            this.tokenPrior.is(TokenType.Unknown)) &&
                        text === DELIMITERS[this.tokenPrior.getText().charAt(0)]
                    ))
            ) {
                closed = true;
                text += DELIMITERS[text];
            }

            const newSource = this.source.withGraphemesAt(text, this.position);
            const newPosition =
                this.position +
                (closed ? 1 : new UnicodeString(text).getLength());

            return newSource === undefined
                ? undefined
                : [
                      newSource,
                      new Caret(
                          newSource,
                          newPosition,
                          newSource.getTokenAt(this.position)
                      ),
                  ];
        } else {
            const wrap = this.wrap(text);
            if (wrap !== undefined) return wrap;

            const edit = this.deleteNode(this.position);
            if (edit === undefined) return;
            const [source, caret] = edit;
            if (caret.position instanceof Node) return;
            const newSource = source.withGraphemesAt(text, caret.position);
            const newPosition = caret.position + text.length;
            return newSource === undefined
                ? undefined
                : [
                      newSource,
                      new Caret(
                          newSource,
                          newPosition,
                          newSource.getTokenAt(newPosition - text.length)
                      ),
                  ];
        }
    }

    isPlaceholder() {
        return this.position instanceof Node && this.position.isPlaceholder();
    }

    /** If the caret is a node, set the position to its first index */
    enter() {
        if (this.position instanceof Node) {
            if (this.position instanceof Token) {
                const index = this.source.getTokenTextPosition(this.position);
                return index !== undefined
                    ? this.withPosition(index + 1)
                    : this;
            }
            return this.withPosition(
                this.position.getChildren()[0] ?? this.position
            );
        } else return this;
    }

    getRange(node: Node): [number, number] | undefined {
        const tokens = node.nodes((t) => t instanceof Token) as Token[];
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

            if (before && after && DELIMITERS[before] === after) {
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
            if (parent instanceof Block && parent.statements.length === 1) {
                return [
                    this.source.replace(parent, parent.statements[0]),
                    this.withPosition(parent.statements[0]),
                ];
            } else if (
                parent instanceof ListLiteral &&
                parent.values.length === 1
            ) {
                return [
                    this.source.replace(parent, parent.values[0]),
                    this.withPosition(parent.values[0]),
                ];
            } else {
                const field = parent?.getFieldOfChild(node);
                const index = this.source.getNodeFirstPosition(node);
                if (field && index !== undefined) {
                    // If in a list or undefined is allowed, just remove it
                    if (
                        Array.isArray(field.types[0]) ||
                        field.types.includes(undefined)
                    ) {
                        return [
                            this.source.replace(node, undefined),
                            this.withPosition(index).withAddition(undefined),
                        ];
                    } else if (field.types.includes(Expression)) {
                        const placeholder = ExpressionPlaceholder.make();
                        return [
                            this.source.replace(node, placeholder),
                            this.withPosition(placeholder).withAddition(
                                undefined
                            ),
                        ];
                    } else if (field.types.includes(Program)) {
                        return [
                            this.source.replace(node, Program.make()),
                            this.withPosition(index).withAddition(undefined),
                        ];
                    }
                    // Is the parent an expression with a single token? Replace the parent.
                    else if (
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
            : [newSource, new Caret(newSource, range[0], undefined)];
    }

    moveVertical(editor: HTMLElement, direction: 1 | -1): Edit | undefined {
        if (this.position instanceof Node) {
            const position = this.source.getNodeFirstPosition(this.position);
            if (position === undefined) return;
            const newCaret = this.getVertical(
                editor,
                direction,
                position,
                false
            );
            if (newCaret === undefined || newCaret.position instanceof Node)
                return newCaret;
            const token = this.source.getTokenAt(newCaret.position, true);
            if (token === undefined) return this;
            return this.withPosition(token);
        } else return this.getVertical(editor, direction, this.position);
    }

    getVertical(
        editor: HTMLElement,
        direction: 1 | -1,
        position: number,
        includeSpace = true
    ) {
        // Find the start of the previous line.
        if (direction < 0) {
            // Keep moving previous while the symbol before isn't a newline.
            while (
                this.getCode().at(position - 1) !== undefined &&
                this.getCode().at(position - 1) !== '\n'
            )
                position--;
            // Move the before the newline to the line above.
            position--;
            // Move to the beginning of this line.
            while (
                this.getCode().at(position - 1) !== undefined &&
                this.getCode().at(position - 1) !== '\n'
            )
                position--;
        } else {
            // If we're at a newline, just move forward past it to the beginning of the next line.
            if (this.getCode().at(position) === '\n') position++;
            // Otherwise, move forward until we find a newline, then move past it.
            else {
                while (
                    this.getCode().at(position) !== undefined &&
                    this.getCode().at(position) !== '\n'
                )
                    position++;
                position++;
            }
        }

        // If we're not including space, and the current position is space, keep moving past it.
        if (!includeSpace) {
            while (this.source.isEmptyLine(position)) position += direction;
            position += direction;
        }

        // If we hit the beginning, set the position to the beginning.
        if (position < 0) return this.withPosition(0);
        // If we hit the end, set the position to the end.
        if (position >= this.getCode().getLength())
            return this.withPosition(this.getCode().getLength());

        // Get the starting token on this line.
        let currentToken = this.source.getTokenAt(position);
        if (currentToken === undefined) return;

        const index = this.source.getTokenTextPosition(currentToken);
        // If the position is on a different line from the current token, just move to the line.
        if (
            index !== undefined &&
            position <
                index - this.source.spaces.getLastLineSpaces(currentToken)
        ) {
            return this.withPosition(position);
        }
        // Find the tokens on the row in the direction we're moving.
        else {
            // Find the caret and it's position.
            let caretView = editor.querySelector('.caret');
            if (!(caretView instanceof HTMLElement)) return;
            if (caretView.classList.contains('node')) {
                caretView = editor.querySelector('.selected');
                if (!(caretView instanceof SVGElement)) return;
            }
            let caretRect = caretView.getBoundingClientRect();

            const caretX = caretRect.left;

            // Find the views on this line and their horizontal distance from the caret.
            const candidates: {
                token: Token;
                rect: DOMRect;
                distance: number;
            }[] = [];
            while (currentToken !== undefined) {
                const view = editor.querySelector(
                    `.token-view[data-id="${currentToken.id}"]`
                );
                if (view) {
                    const rect = view.getBoundingClientRect();
                    candidates.push({
                        token: currentToken,
                        rect: rect,
                        distance: Math.min(
                            Math.abs(caretX - rect.left),
                            Math.abs(caretX - rect.right)
                        ),
                    });
                }
                currentToken = this.source.getNextToken(currentToken, 1);
                // If we reached a token with newlines, then we're done adding tokens for consideration.
                if (
                    currentToken &&
                    this.source.spaces.hasLineBreak(currentToken)
                )
                    break;
            }

            // Sort the candidates by distance, then find the offset within the token closest to the caret.
            const sorted = candidates.sort((a, b) => a.distance - b.distance);
            if (sorted.length > 0) {
                const choice = sorted[0];
                const length = choice.token.getTextLength();
                const startPosition = this.source.getTokenTextPosition(
                    choice.token
                );
                if (startPosition !== undefined && length !== undefined) {
                    // Choose the offset based on whether the caret is to the left, right, or in between the horizontal axis of the chosen token.
                    const offset =
                        caretRect.left > choice.rect.right
                            ? length
                            : caretRect.left < choice.rect.left
                            ? 0
                            : choice.rect.width === 0
                            ? 0
                            : Math.round(
                                  length *
                                      ((caretRect.left - choice.rect.left) /
                                          choice.rect.width)
                              );
                    return this.withPosition(startPosition + offset);
                }
            }
        }
    }

    wrap(key: string): Edit | undefined {
        let node = this.position instanceof Node ? this.position : undefined;
        if (node instanceof Token && !node.is(TokenType.End))
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
}
