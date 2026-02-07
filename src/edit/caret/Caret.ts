import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import { UnknownName } from '@conflicts/UnknownName';
import { UnknownTypeName } from '@conflicts/UnknownTypeName';
import type { LocaleTextAccessor } from '@locale/Locales';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Block from '@nodes/Block';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ListLiteral from '@nodes/ListLiteral';
import Node, { Empty, FieldKind, ListOf, type Field } from '@nodes/Node';
import NumberType from '@nodes/NumberType';
import Program from '@nodes/Program';
import Source from '@nodes/Source';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import Unit from '@nodes/Unit';
import Spaces from '@parser/Spaces';
import { ELISION_SYMBOL, PROPERTY_SYMBOL } from '@parser/Symbols';
import {
    DelimiterCloseByOpen,
    DelimiterOpenByClose,
    isName,
    TextOpenByTextClose,
    tokens,
} from '@parser/Tokenizer';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import type {
    Edit,
    ProjectRevision,
    Revision,
} from '../../components/editor/commands/Commands';
import type Conflict from '../../conflicts/Conflict';
import Project from '../../db/projects/Project';
import type LanguageCode from '../../locale/LanguageCode';
import NodeRef from '../../locale/NodeRef';
import Bind from '../../nodes/Bind';
import BooleanLiteral from '../../nodes/BooleanLiteral';
import Context from '../../nodes/Context';
import type Definition from '../../nodes/Definition';
import DefinitionExpression from '../../nodes/DefinitionExpression';
import { LanguageTagged } from '../../nodes/LanguageTagged';
import Literal from '../../nodes/Literal';
import Name from '../../nodes/Name';
import NameType from '../../nodes/NameType';
import NumberLiteral from '../../nodes/NumberLiteral';
import Reference from '../../nodes/Reference';
import SetLiteral from '../../nodes/SetLiteral';
import Translation from '../../nodes/Translation';
import Type from '../../nodes/Type';
import TypeVariable from '../../nodes/TypeVariable';
import UnicodeString from '../../unicode/UnicodeString';
import { completeInsertion } from './Complete';

/**
 * Conflicts that are permitted on insertion. We permit these to allow for some
 * flexibility in typing names and for thinking through types.
 */
export const NegligibleConflicts: (new (...args: any[]) => Conflict)[] = [
    UnknownName,
    UnknownTypeName,
    IncompatibleCellType,
    IncompatibleType,
    IncompatibleInput,
];

export type InsertionContext = { before: Node[]; after: Node[] };

/**
 * Selections can be a single text buffer position, a range, or a node.
 */
export type CaretPosition = number | Node | [number, number];
export type Entry = 'previous' | 'next' | undefined;

export function isCaretPosition(position: any): position is CaretPosition {
    return (
        typeof position === 'number' ||
        position instanceof Node ||
        (Array.isArray(position) &&
            position.length === 2 &&
            typeof position[0] === 'number' &&
            typeof position[1] === 'number')
    );
}

export function isPosition(position: CaretPosition): position is number {
    return typeof position === 'number';
}
export function isRange(position: CaretPosition): position is [number, number] {
    return Array.isArray(position);
}
export function isNode(position: CaretPosition): position is Node {
    return position instanceof Node;
}

export default class Caret {
    readonly source: Source;
    readonly position: CaretPosition;
    /** The latest column of the caret in the code with preferred spacing */
    readonly column: number;
    readonly entry: Entry;
    // The node recently added.
    readonly addition: Node | undefined;

    // The token we're at, including preceding space.
    readonly tokenIncludingSpace: Token | undefined;

    // The token before the caret.
    readonly tokenPrior: Token | undefined;

    // The index of the beginning of the token's preceding space.
    readonly tokenSpaceIndex: number | undefined;

    // The token the caret is at, excluding preceding space.
    readonly tokenExcludingSpace: Token | undefined;

    constructor(
        source: Source,
        position: CaretPosition,
        column: number | undefined,
        entry: Entry,
        addition: Node | undefined,
    ) {
        this.source = source;
        this.position = position;
        // No column provided? Compute it from the position. Otherwise set it.
        this.column =
            column === undefined
                ? typeof position === 'number'
                    ? (this.source.getColumn(position) ?? 0)
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

    getExpressionAt() {
        const start =
            this.position instanceof Node
                ? this.position
                : this.tokenExcludingSpace;
        if (start === undefined) return undefined;
        if (start instanceof Expression) return start;
        return this.source.root
            .getAncestors(start)
            .find((n): n is Expression => n instanceof Expression);
    }

    getNodeInside() {
        return isPosition(this.position)
            ? this.insideToken()
                ? this.tokenExcludingSpace
                : undefined
            : isNode(this.position)
              ? this.position
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
        if (this.tokenExcludingSpace === undefined || !this.isPosition())
            return false;
        const start = this.source.getTokenTextPosition(
            this.tokenExcludingSpace,
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
                        literal instanceof BooleanLiteral,
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
                      : this.tokenIncludingSpace,
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

    getLine() {
        return this.source.getLine(
            Array.isArray(this.position) ? this.position[1] : this.position,
        );
    }

    getNodesBetween() {
        const empty = { before: [], after: [] };

        // If the caret is a node, there is no notion of between.
        if (!this.isPosition() || this.tokenIncludingSpace === undefined)
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
        const pairs: InsertionContext = { before: [], after: [] };

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
                        (t): t is Token => t instanceof Token,
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

    /** If the position is an index, return it, undefined otherwise. */
    getIndex() {
        return this.isIndex() ? (this.position as number) : undefined;
    }

    isSpace(c: string) {
        return /[\t\n ]/.test(c);
    }

    isTab(c: string) {
        return /[\t]/.test(c);
    }

    isNode(): this is { position: Node } {
        return this.position instanceof Node;
    }

    isPosition(): this is { position: number } {
        return typeof this.position === 'number';
    }

    isRange(): this is { position: [number, number] } {
        return Array.isArray(this.position);
    }

    isAtPropertyReference() {
        if (!this.isPosition()) return false;
        return this.source.getCode().at(this.position - 1) === PROPERTY_SYMBOL;
    }

    /** True if this caret's position is or is inside of the given node. */
    isIn(node: Node, includeEnd: boolean) {
        if (this.isNode())
            return (
                this.position === node ||
                this.source.root.hasAncestor(this.position, node)
            );
        if (this.isPosition()) {
            const start = this.source.getNodeFirstPosition(node);
            const end = this.source.getNodeLastPosition(node);
            return (
                start !== undefined &&
                end !== undefined &&
                start <= this.position &&
                (includeEnd ? this.position <= end : this.position < end)
            );
        } else return false;
    }

    /** Get the code position corresponding to the beginning of the given row.  */
    rowPosition(row: number): number | undefined {
        const lines = this.source.getCode().getLines();
        if (row < 0 || row >= lines.length) return undefined;
        let rowPosition = 0;
        for (let i = 0; i < row; i++) rowPosition += lines[i].getLength() + 1;
        return rowPosition;
    }

    left(sibling: boolean): Caret {
        return this.moveInlineText(sibling, -1);
    }
    right(sibling: boolean): Caret {
        return this.moveInlineText(sibling, 1);
    }

    nextNewline(direction: -1 | 1): Caret | undefined {
        if (typeof this.position !== 'number') return undefined;
        let pos = this.position;
        while (pos >= 0 && pos < this.source.getCode().getLength()) {
            pos += direction;
            if (this.source.getCode().at(pos) === '\n') break;
        }
        return this.withPosition(
            Math.min(Math.max(0, pos), this.source.getCode().getLength()),
        );
    }

    moveInlineText(sibling: boolean, direction: -1 | 1): Caret {
        // Map the direction onto an entry direction.
        const entry = direction > 0 ? 'next' : 'previous';
        if (this.isNode()) {
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
        } else if (this.isPosition() || this.isRange()) {
            const currentPosition =
                typeof this.position === 'number'
                    ? this.position
                    : this.position[1];

            // At the beginning or end? Do nothing.
            if (
                this.position ===
                (direction < 0 ? 0 : this.source.getCode().getLength())
            )
                return this;

            // At a token start and going next? Select the token.
            const token = this.source.getTokenAt(currentPosition, false);
            const tokenBefore = this.source.getTokenAt(
                currentPosition - 1,
                false,
            );

            // If we found a token and we're moving next and we're at the token's start, choose the token or its parent if it's an only child or a child of a placeholder
            if (
                token &&
                direction > 0 &&
                this.source.getTokenTextPosition(token) === this.position
            )
                return this.withPosition(
                    this.getParentOfOnlyChild(token),
                    this.column,
                    entry,
                );
            // If we found a token before and we're moving before and we're at the token's end, choose the token or its parent if it's an only child or a child of a placeholder
            else if (
                tokenBefore &&
                direction < 0 &&
                this.source.getTokenLastPosition(tokenBefore) === this.position
            )
                return this.withPosition(
                    this.getParentOfOnlyChild(tokenBefore),
                    this.column,
                    entry,
                );

            return this.withPosition(
                currentPosition + direction,
                this.source.getColumn(currentPosition + direction),
                entry,
            );
        }
        // Some other mystery selection type? Do nothing.
        else return this;
    }

    /** A block editable token is a non-reference name, words, or a number. */
    static isTokenTextBlockEditable(
        token: Token,
        parent: Node | undefined,
    ): boolean {
        return (
            token.isSymbol(Sym.Words) ||
            token.isSymbol(Sym.Number) ||
            token.isSymbol(Sym.URL) ||
            (token.isSymbol(Sym.Name) &&
                parent !== undefined &&
                !(parent instanceof Reference))
        );
    }

    static isTokenBlockEditable(token: Token): boolean {
        return (
            token.isSymbol(Sym.Name) ||
            token.isSymbol(Sym.Operator) ||
            token.isSymbol(Sym.Words) ||
            token.isSymbol(Sym.Number) ||
            token.isSymbol(Sym.Text) ||
            token.isSymbol(Sym.Boolean) ||
            token.isSymbol(Sym.Placeholder)
        );
    }

    getBlockPositions(): (Node | number)[] {
        // Find all the tokens in a series of fields, for identifying positions before and after lists.
        function getFieldTokens(node: Node, fields: Field[]) {
            return fields
                .map((field) => node.getField(field.name))
                .filter((v) => v !== undefined)
                .map((v) =>
                    Array.isArray(v)
                        ? v.map((el) => el.leaves()).flat()
                        : v.leaves(),
                )
                .flat();
        }

        const points: (Node | number)[] = [];
        const nodes = this.source.expression.nodes();
        for (const node of nodes) {
            if (node instanceof Token) {
                const tokenParent = this.source.root.getParent(node);
                // Include all preceding spaces, since we render them.
                const space = this.source.spaces.getSpace(node);
                const position = this.source.getTokenTextPosition(node);
                if (position !== undefined) {
                    for (let index = 0; index < space.length; index++) {
                        if (space.charAt(index) === ' ') {
                            points.push(position - space.length + index);
                        }
                    }
                }

                // If the token's individual symbols are editable, include the many positions.
                if (Caret.isTokenTextBlockEditable(node, tokenParent)) {
                    const start = this.source.getTokenTextPosition(node);
                    const end = this.source.getTokenLastPosition(node);
                    if (start !== undefined && end !== undefined) {
                        for (let pos = start; pos <= end; pos++)
                            points.push(pos);
                    }
                }
                // If the token itself is editable and not an only child, add it to the list.
                else if (Caret.isTokenBlockEditable(node)) {
                    // If an only child or a placeholder, include it's parent, not the token itself.
                    if (
                        (tokenParent !== undefined &&
                            tokenParent.hasOneLeaf()) ||
                        tokenParent instanceof ExpressionPlaceholder
                    )
                        points.push(tokenParent);
                    else points.push(node);
                }
            }
            // If it's not a token, check it's grammar for insertion points.
            else {
                // Expression or type with a single child ? Include it.
                if (
                    (node instanceof Literal || node instanceof Name) &&
                    node.hasOneLeaf()
                )
                    points.push(node);

                // Inspect the grammar of the node for a list of insertion points.
                const grammar = node.getGrammar();
                for (let index = 0; index < grammar.length; index++) {
                    const field = grammar[index];
                    // If it's optionally empty field and it's empty, add a point to insert to it.
                    if (
                        field.kind.isOptional() &&
                        node.getField(field.name) === undefined
                    ) {
                        // Find the position of the empty field. This is either the position of the first token after it, or the last token before it if there is no token after it, or the position of the node if there are no tokens.
                        const tokensAfterField = getFieldTokens(
                            node,
                            grammar.slice(index + 1),
                        );
                        const firstTokenAfter = tokensAfterField.at(0);
                        if (firstTokenAfter) {
                            const firstPosition =
                                this.source.getTokenTextPosition(
                                    firstTokenAfter,
                                );
                            if (firstPosition !== undefined)
                                points.push(firstPosition);
                        } else {
                            const tokensBeforeField = getFieldTokens(
                                node,
                                grammar.slice(0, index),
                            );
                            const lastTokenBefore = tokensBeforeField.at(-1);
                            if (lastTokenBefore) {
                                const lastPosition =
                                    this.source.getTokenLastPosition(
                                        lastTokenBefore,
                                    );
                                if (lastPosition !== undefined)
                                    points.push(lastPosition);
                            } else {
                                const emptyPosition =
                                    this.source.getNodeFirstPosition(node);
                                if (emptyPosition) points.push(emptyPosition);
                            }
                        }
                    }
                    // If it's a list field, see if someting can be inserted in the list.
                    else if (field.kind instanceof ListOf) {
                        // Get the list values.
                        const values = node.getField(field.name);
                        if (Array.isArray(values)) {
                            // Add an insertion point for the beginning of the list.
                            const tokensBeforeField = getFieldTokens(
                                node,
                                grammar.slice(0, index),
                            );
                            const lastTokenBefore = tokensBeforeField.at(-1);
                            if (lastTokenBefore) {
                                const lastPosition =
                                    this.source.getTokenLastPosition(
                                        lastTokenBefore,
                                    );
                                if (lastPosition !== undefined)
                                    points.push(lastPosition);
                            } else {
                                const emptyPosition =
                                    this.source.getNodeFirstPosition(node);
                                if (emptyPosition) points.push(emptyPosition);
                            }

                            // No tokens before the list? See if there's a token in the list.
                            if (values.length > 0) {
                                const firstToken = values[0].leaves().at(0);
                                if (firstToken) {
                                    const firstPosition =
                                        this.source.getTokenTextPosition(
                                            firstToken,
                                        );
                                    if (firstPosition !== undefined)
                                        points.push(firstPosition);
                                }
                            }
                            // No tokens before the list? See if there are tokens after.
                            const tokensAfterField = getFieldTokens(
                                node,
                                grammar.slice(index + 1),
                            );
                            const firstTokenAfter = tokensAfterField.at(0);
                            if (firstTokenAfter) {
                                const firstPosition =
                                    this.source.getTokenTextPosition(
                                        firstTokenAfter,
                                    );
                                if (firstPosition !== undefined)
                                    points.push(firstPosition);
                            }

                            // Then, go through each value of the list and add an insertion point after the last token of each element.
                            // But find the position of the whitespace after it.
                            for (const value of values) {
                                const tokens = value.leaves();
                                const lastToken = tokens.at(-1);
                                if (lastToken) {
                                    const lastPosition =
                                        this.source.getTokenLastPosition(
                                            lastToken,
                                        );

                                    if (lastPosition !== undefined) {
                                        const nextToken =
                                            this.source.getTokenAfterNode(
                                                lastToken,
                                            );
                                        const nextPosition = nextToken
                                            ? this.source.getTokenTextPosition(
                                                  nextToken,
                                              )
                                            : undefined;
                                        points.push(
                                            nextPosition ?? lastPosition,
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Remove duplicates and sort.
        return Array.from(new Set(points)).sort((a, b) => {
            const aPosition =
                a instanceof Node
                    ? a instanceof Token
                        ? (this.source.getTokenTextPosition(a) ?? 0)
                        : (this.source.getNodeFirstPosition(a) ?? 0)
                    : a;
            const bPosition =
                b instanceof Node
                    ? b instanceof Token
                        ? (this.source.getTokenTextPosition(b) ?? 0)
                        : (this.source.getNodeFirstPosition(b) ?? 0)
                    : b;
            return aPosition === bPosition && typeof a === 'number'
                ? -1
                : aPosition - bPosition;
        });
    }

    /** Move to the next node or position in blocks mode. */
    moveInlineBlock(direction: -1 | 1): Caret | LocaleTextAccessor {
        // Find the current position.
        const currentPosition = isPosition(this.position)
            ? this.position
            : isRange(this.position)
              ? this.position[0]
              : direction < 0
                ? this.source.getNodeFirstPosition(this.position)
                : this.source.getNodeLastPosition(this.position);

        // No current position for some reason? No change;
        if (currentPosition === undefined)
            return (l) => l.ui.source.cursor.ignored.noMove;

        // Get all eligible caret positions in blocks mode, in the order in which we'll search for the next position.
        const positions = this.getBlockPositions();
        if (direction < 0) positions.reverse();

        // Go through all of the eligible positions
        const onNode = this.isNode();
        for (const possible of positions) {
            const possibleIsIndex = typeof possible === 'number';
            const possibleIndex = possibleIsIndex
                ? possible
                : this.source.getNodeFirstPosition(possible);
            // Is this position after the current position, or at the same position, but moving from a node? This is the next position.
            if (
                possibleIndex !== undefined &&
                // Moving next?
                (direction > 0
                    ? // Is the possible index after the current index?
                      possibleIndex > currentPosition ||
                      // Is the possible index the same as the current index but we're currently on a node and the possible is an index?
                      (possibleIndex === currentPosition &&
                          onNode &&
                          possibleIsIndex) ||
                      // Are not on a node and the possible index is a node at the current position?
                      (!onNode &&
                          !possibleIsIndex &&
                          possibleIndex === currentPosition)
                    : // Moving previous?
                      // Is the possible index before the current position?
                      possibleIndex < currentPosition ||
                      // Is the current position a node and the possible index is at the node's first position?
                      (onNode &&
                          typeof possible === 'number' &&
                          possibleIndex === currentPosition))
            ) {
                return this.withPosition(possible);
            }
        }
        return (l) => l.ui.source.cursor.ignored.noMove;
    }

    expandInline(amount: number) {
        // Currently a position? Create a range with the current position as the start, and the end with the adjustment.
        if (isPosition(this.position)) {
            return this.withPosition([
                this.position,
                Math.max(
                    0,
                    Math.min(
                        this.position + amount,
                        this.source.getCode().getLength(),
                    ),
                ),
            ]);
        }
        // Already a range? Expand the end.
        else if (this.isRange()) {
            const [start, end] = this.position;
            return this.withPosition([
                start,
                Math.max(
                    0,
                    Math.min(end + amount, this.source.getCode().getLength()),
                ),
            ]);
        }
        // Node? Don't do anything.
        else return this;
    }

    expandVertically(amount: -1 | 1) {
        if (isPosition(this.position)) {
            const verticalPosition = this.getVertical(amount, this.position);
            if (verticalPosition && verticalPosition.isPosition())
                return this.withPosition([
                    this.position,
                    verticalPosition.position,
                ]);
            else return this;
        }
        // Already a range? Expand the end.
        else if (this.isRange()) {
            const [start, end] = this.position;
            const verticalPosition = this.getVertical(amount, end);
            if (verticalPosition && verticalPosition.isPosition())
                return this.withPosition([start, verticalPosition.position]);
            else return this;
        }
        // Node? Don't do anything.
        else return this;
    }

    atLineBoundary(start: boolean): Caret {
        let position = isNode(this.position)
            ? this.source.getNodeFirstPosition(this.position)
            : isPosition(this.position)
              ? this.position
              : this.position[0];

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
            return this.withPosition(this.source.code.getLength());
        }
    }

    atStart(): Caret {
        return this.withPosition(0);
    }

    atEnd(): Caret {
        return this.withPosition(this.source.code.getLength());
    }

    getParentOfOnlyChild(token: Token): Node {
        const parent = this.source.root.getParent(token);
        return parent && parent.hasOneLeaf() && parent.leaves()[0] === token
            ? parent
            : token;
    }

    getTextPosition(start: boolean, offset = 0): number | undefined {
        if (isNode(this.position)) {
            // Get the first or last token of the given node.
            const tokens = this.position.nodes(
                (n): n is Token => n instanceof Token,
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
        } else if (isPosition(this.position)) return this.position;
        else return this.position[0];
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
        position: CaretPosition,
        column?: number,
        entry?: Entry,
    ): Caret {
        if (typeof position === 'number' && isNaN(position))
            throw Error('NaN on caret set!');
        return new Caret(
            this.source,
            typeof position === 'number'
                ? Math.max(
                      0,
                      Math.min(position, this.source.getCode().getLength()),
                  )
                : position,
            // If given a column set it, otherwise keep the old one.
            column ?? this.column,
            entry ?? this.entry,
            this.addition,
        );
    }

    withSource(source: Source) {
        return new Caret(
            source,
            this.position,
            this.column,
            this.entry,
            this.addition,
        );
    }

    withEntry(entry: Entry) {
        return new Caret(
            this.source,
            this.position,
            this.column,
            entry,
            this.addition,
        );
    }

    withAddition(addition: Node | undefined) {
        return new Caret(
            this.source,
            this.position,
            this.column,
            this.entry,
            addition,
        );
    }

    withoutAddition() {
        return new Caret(
            this.source,
            this.position,
            this.column,
            this.entry,
            undefined,
        );
    }

    insertNode(node: Node, offset: number): Edit | undefined {
        if (isNode(this.position)) {
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
                    node,
                ),
            ];
        } else if (isRange(this.position)) {
            let newSource: Source | undefined = this.source;
            const [start, end] = this.position;
            // Without selection
            newSource = newSource.withoutGraphemesBetween(start, end);
            if (newSource === undefined) return undefined;
            // With node text
            newSource = newSource.withGraphemesAt(
                node.toWordplay(getPreferredSpaces(node)),
                start,
            );
            if (newSource === undefined) return undefined;
            return [
                newSource,
                new Caret(
                    newSource,
                    start + offset,
                    this.column,
                    undefined,
                    node,
                ),
            ];
        } else {
            const position = this.position;
            if (position === undefined) return;
            const newSource = this.source.withGraphemesAt(
                node.toWordplay(getPreferredSpaces(node)),
                position,
            );
            if (newSource === undefined) return undefined;

            return [
                newSource,
                new Caret(
                    newSource,
                    position + offset,
                    this.column,
                    undefined,
                    newSource.getTokenAt(position),
                ),
            ];
        }
    }

    /** Insert text at the current position. If complete is true, will automatically close a delimited symbol. */
    insert(
        text: string,
        // Whether in blocks mode, meaning no syntax errors allowed.
        blocks: boolean,
        project: Project,
        complete = true,
    ): Edit | ProjectRevision | LocaleTextAccessor {
        // Normalize the mystery string, ensuring it follows Unicode normalization form.
        text = text.normalize();

        if (blocks) {
            // Don't permit tabs or newlines unless inside a block editable token.
            if (text == '\t')
                return (l) => l.ui.source.cursor.ignored.blockSpace;
        }

        // See if it's a rename.
        const renameEdit = project
            ? this.insertRename(text, project)
            : undefined;
        if (renameEdit) return [renameEdit[0], renameEdit[1]];

        let newSource: Source | undefined;
        let newPosition: number | Node;
        let originalPosition: number;

        // Does this insertion complete a delimiter? Just advance the caret.
        if (this.insertionCompletesDelimiter(text))
            return [this.source, this.withPosition(this.position + 1)];

        // Before doing insertion, see if a node is selected, and if so, wrap or remove it.
        if (this.position instanceof Node) {
            // Is this a placeholder being replaced with numbers? Replace it, preserving units.
            if (
                tokens(text)[0].isSymbol(Sym.Number) &&
                this.position instanceof ExpressionPlaceholder &&
                this.position.type instanceof NumberType &&
                this.position.type.unit instanceof Unit
            ) {
                newSource = this.source.replace(
                    this.position,
                    new NumberLiteral(
                        new Token(text, Sym.Number),
                        this.position.type.unit.clone(),
                    ),
                );
                newPosition =
                    (this.source.getNodeFirstPosition(this.position) ?? 0) + 1;
                return [
                    newSource,
                    this.withSource(newSource).withPosition(newPosition),
                ];
            }

            // Try wrapping the node
            const wrap = this.wrap(project, text);
            if (wrap !== undefined) return wrap;

            // If that didn't do anything, try deleting the node.
            const edit = this.deleteNode(this.position, false, project);
            // If that didn't do anything, do nothing; it's not removeable.
            if (edit === undefined)
                return (l) => l.ui.source.cursor.ignored.noDelete;
            if (!Array.isArray(edit)) return edit;
            const [source, caret] = edit;
            if (!isPosition(caret.position))
                return (l) => l.ui.source.cursor.ignored.noDelete;

            // Otherwise, we deleted it! Update the source and position.
            newSource = source;
            newPosition = caret.position;
            originalPosition = caret.position;
        }
        // If it's a single position, do nothing.
        else if (isPosition(this.position)) {
            newSource = this.source;
            newPosition = this.position;
            originalPosition = this.position;
        }
        // If it's a range, delete the range.
        else {
            // Swap if out of order.
            let [start, end] = this.position;
            if (start > end) {
                const temp = start;
                start = end;
                end = temp;
            }
            if (start === end) {
                newSource = this.source;
                newPosition = start;
                originalPosition = start;
            } else {
                const edit = this.source.withoutGraphemesBetween(start, end);
                if (edit === undefined)
                    return (l) => l.ui.source.cursor.ignored.noDelete;
                newSource = edit;
                newPosition = start;
                originalPosition = start;
            }
        }

        // Construct a new caret based on the revision.
        const newCaret = this.withSource(newSource).withPosition(newPosition);

        // Let's see if we should do any delimiter completion before we insert.
        const completion = complete
            ? completeInsertion(project, newCaret, text, blocks)
            : undefined;

        // Update the source, position, and text of delimiter completion, if there is one.
        if (completion) {
            const [newSource, newPosition] = completion;

            // Finally, if we're in blocks mode, verify that the insertion was valid.
            if (blocks) {
                if (
                    project.getNewConflicts(
                        this.source,
                        newSource,
                        NegligibleConflicts,
                    ).length > 0
                )
                    return (l) => l.ui.source.cursor.ignored.noError;
            }

            return [
                newSource,
                this.withSource(newSource).withPosition(newPosition),
            ];
        }
        // No autocomplete,
        else {
            // Insert the possibly revised text.
            newSource = newSource.withGraphemesAt(text, newPosition);

            // Did we somehow get no source? Bail.
            if (newSource === undefined)
                return (l) => l.ui.source.cursor.ignored.noInsert;

            // What's the new token we added?
            const newToken = newSource.getTokenAt(originalPosition, false);

            // Find the position.
            newPosition = newPosition + new UnicodeString(text).getLength();

            // Finally, if we're in blocks mode, verify that the insertion was valid.
            if (blocks) {
                if (
                    project.getNewConflicts(
                        this.source,
                        newSource,
                        NegligibleConflicts,
                    ).length > 0
                )
                    return (l) => l.ui.source.cursor.ignored.noError;
            }

            return [
                newSource,
                new Caret(
                    newSource,
                    newPosition,
                    undefined,
                    undefined,
                    newToken,
                ),
            ];
        }
    }

    insertRename(text: string, project: Project) {
        // In a name or just after name that's part of a reference or a bind? Try to do a rename instead of an edit.
        if (typeof this.position !== 'number') return undefined;

        // Are we in the middle of a name or at it's end?
        const rename = this.tokenExcludingSpace?.isSymbol(Sym.Name)
            ? this.tokenExcludingSpace
            : this.tokenPrior?.isSymbol(Sym.Name) && this.atTokenEnd()
              ? this.tokenPrior
              : undefined;
        const renameParent = rename
            ? this.source.root.getParent(rename)
            : undefined;
        if (!(renameParent instanceof Name)) return undefined;

        let start: number | undefined;
        let newName: string | undefined;

        if (rename === this.tokenExcludingSpace && this.tokenExcludingSpace) {
            start = this.source.getTokenTextPosition(this.tokenExcludingSpace);
            newName =
                start === undefined
                    ? undefined
                    : this.tokenExcludingSpace
                          .getText()
                          .substring(0, this.position - start) +
                      text +
                      this.tokenExcludingSpace
                          .getText()
                          .substring(this.position - start);
        } else if (rename === this.tokenPrior && this.tokenPrior) {
            start = this.source.getTokenTextPosition(this.tokenPrior);
            newName = this.tokenPrior.getText() + text;
        }

        if (start !== undefined && newName && isName(newName)) {
            const edit = this.rename(
                renameParent,
                newName,
                project,
                this.position - start + new UnicodeString(text).getLength(),
            );
            if (edit) return edit;
        }
    }

    // If the character we're inserting is already immediately after the caret and is a matched closing deimiter, don't insert, just move the caret forward.
    // We handle two cases: discrete matched tokens ([], {}, ()) text tokens that have internal matched delimiters.
    insertionCompletesDelimiter(text: string): this is { position: number } {
        return (
            this.isPosition() &&
            this.tokenIncludingSpace !== undefined &&
            // Is what's being typed a closing delimiter?
            text in DelimiterOpenByClose &&
            // Is the text being typed what's already there?
            text === this.source.code.at(this.position) &&
            // Is what's being typed a closing delimiter of a text literal?
            ((this.tokenIncludingSpace.isSymbol(Sym.Text) &&
                TextOpenByTextClose[
                    this.tokenIncludingSpace.getText().charAt(0)
                ] === text) ||
                // Is what's being typed a closing delimiter of an open delimiter?
                (this.tokenIncludingSpace.getText() in DelimiterOpenByClose &&
                    this.source.getMatchedDelimiter(
                        this.tokenIncludingSpace,
                    ) !== undefined))
        );
    }

    isInsideWords() {
        const isText =
            this.tokenExcludingSpace !== undefined &&
            this.tokenExcludingSpace.isSymbol(Sym.Words);
        const isAfterText =
            this.tokenPrior !== undefined &&
            this.tokenPrior.isSymbol(Sym.Words);
        return (isText && !this.betweenDelimiters()) || isAfterText;
    }

    isPlaceholderNode() {
        return this.position instanceof Node && this.position.isPlaceholder();
    }

    /** If the caret is a node, set the position to its first index */
    enter(blocks: boolean) {
        if (this.position instanceof Node) {
            const parent = this.source.root.getParent(this.position);
            // Token? Set a position.
            if (this.position instanceof Token) {
                if (
                    blocks &&
                    !Caret.isTokenTextBlockEditable(this.position, parent)
                )
                    return false;

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
                    if (
                        blocks &&
                        !Caret.isTokenTextBlockEditable(first, parent)
                    )
                        return false;
                    const index = this.source.getTokenTextPosition(first);
                    return index !== undefined
                        ? this.withPosition(index + 1)
                        : this;
                } else
                    return this.withPosition(
                        this.position.getChildren()[0] ?? this.position,
                    );
            }
        } else return this;
    }

    replace(old: Node, replacement: string): Edit | undefined {
        const range = this.source.getRange(old);
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
                newSource.getTokenAt(newPosition),
            ),
        ];
    }

    /**
     *
     * @param edited The name or reference that was edited
     * @param newName The new name
     * @param project The project being edited
     * @param offset How far from the start of the edited name to move the cursor. Relative to the name since the name's source positions are not stable since many names can change.
     * @returns A revised project and caret, or nothing
     */
    rename(
        edited: Reference | Name,
        newName: string,
        project: Project,
        offset: number,
    ): [Project, Caret, Name] | undefined {
        let name: Name | undefined;
        let definition: Definition | undefined;
        // If the edited thing is a reference, find it's definition and the corresponding name that was edited.
        if (edited instanceof Reference) {
            definition = edited.resolve(project.getContext(this.source));
            name = definition?.names.names.find(
                (n) => n.getName() === edited.getName(),
            );
        }
        // If it was a name, find the definition that the name is naming
        else {
            name = edited;
            definition = this.source.root
                .getAncestors(edited)
                .find(
                    (node): node is Definition =>
                        node instanceof DefinitionExpression ||
                        node instanceof Bind ||
                        node instanceof TypeVariable,
                );
            // Rename
        }

        // If we found both a name and a definition, find all of the references to the definition
        if (name && definition) {
            const references = project
                .getSources()
                .map((source) =>
                    source
                        .nodes()
                        .filter(
                            (node): node is Reference | NameType =>
                                (node instanceof Reference ||
                                    node instanceof NameType) &&
                                node.resolve(project.getContext(source)) ===
                                    definition &&
                                node.getName() === name?.getName(),
                        ),
                )
                .flat();

            // Remember which source we're editing.
            const sourceIndex = project.getSources().indexOf(this.source);

            // Make a new name
            const revisedName = name.withName(newName);

            // Rename the name and all the references
            const revisions = [
                [name, revisedName],
                ...references.map((ref) => [ref, ref.withName(newName)]),
            ] as [Node, Node][];

            // Revise the project and get the corresponding revised source.
            const revisedProject = project.withRevisedNodes(revisions);
            const revisedSource = revisedProject.getSources()[sourceIndex];

            // Find the new source position of the edited name so we can find the new position of the caret.
            const editedRevision = revisions.find(
                (revision) => revision[0] === edited,
            );
            // Bail if we couldn't find it for some reason.
            if (editedRevision === undefined) return undefined;
            const start = revisedSource.getTokenTextPosition(
                editedRevision[1]
                    .leaves()
                    .find((t) => t.isSymbol(Sym.Name)) as Token,
            );
            // Bail if we couldn't find the start position for some reason.
            if (start === undefined) return undefined;

            // Return the revised project and caret position.
            return [
                revisedProject,
                this.withSource(revisedSource).withPosition(start + offset),
                revisedName,
            ];
        }
    }

    /**
     * Remove content in the specified direction at the current position
     * @param project The project being edited
     * @param forward If true, delete content after caret, otherwise delete content before caret.
     */
    delete(
        project: Project,
        forward: boolean,
        validOnly: boolean,
    ): Edit | ProjectRevision | LocaleTextAccessor | undefined {
        const offset = forward ? 0 : -1;

        // If the position is a number, see if this is a rename
        if (isPosition(this.position)) {
            // Otherwise, figure out what to delete.
            // Are we in the middle of a name or at it's end?
            const rename = forward
                ? this.tokenExcludingSpace?.isSymbol(Sym.Name) &&
                  !this.atTokenEnd()
                    ? this.tokenExcludingSpace
                    : undefined
                : this.tokenExcludingSpace?.isSymbol(Sym.Name) &&
                    !this.atTokenStart()
                  ? this.tokenExcludingSpace
                  : this.tokenPrior?.isSymbol(Sym.Name) && this.atTokenEnd()
                    ? this.tokenPrior
                    : undefined;
            const renameParent = rename
                ? this.source.root.getParent(rename)
                : undefined;
            // If the name token is in a name or reference and the name being backspaced is more than one character, then try to rename.
            if (
                renameParent instanceof Name &&
                // Disabled  reference renaming, it's annoying.
                // || renameParent instanceof Reference
                // Don't rename if we're deleting the whole name.
                rename &&
                rename?.getTextLength() > 1
            ) {
                let start: number | undefined;
                let newName: string | undefined;

                // Are we deleting in the the middle of the name?
                if (
                    rename === this.tokenExcludingSpace &&
                    this.tokenExcludingSpace
                ) {
                    // Remember the offset of the caret
                    start = this.source.getTokenTextPosition(
                        this.tokenExcludingSpace,
                    );
                    newName =
                        start !== undefined
                            ? this.tokenExcludingSpace
                                  .getText()
                                  .substring(
                                      0,
                                      this.position -
                                          start +
                                          (forward ? 0 : -1),
                                  ) +
                              this.tokenExcludingSpace
                                  .getText()
                                  .substring(
                                      this.position - start + (forward ? 1 : 0),
                                  )
                            : undefined;
                }
                // If we're backspacing the end of the name...
                else if (rename === this.tokenPrior && this.tokenPrior) {
                    // Remmeber position at the end of the token
                    start = this.source.getTokenTextPosition(this.tokenPrior);
                    newName = this.tokenPrior
                        .getText()
                        .substring(0, this.tokenPrior.getTextLength() - 1);
                }

                // Without the character prior to the current one in the name.
                if (start !== undefined && newName) {
                    // Try to rename, removing the character just before the caret.
                    const edit = this.rename(
                        renameParent,
                        newName,
                        project,
                        this.position - start + offset,
                    );
                    // If we succeeded, return the edit.
                    if (edit) return [edit[0], edit[1]];
                }
            }

            const before = this.source
                .getCode()
                .at(forward ? this.position : this.position - 1);
            const after = this.source
                .getCode()
                .at(forward ? this.position + 1 : this.position);

            // Is this just after a placeholder? Delete the whole placeholder.
            const placeholder = this.getPlaceholderAtPosition(
                this.position + offset,
            );
            if (placeholder)
                return this.deleteNode(placeholder, validOnly, project);

            if (before && after && DelimiterCloseByOpen[before] === after) {
                // If there's an adjacent pair of delimiters, delete them both.
                let newSource = this.source.withoutGraphemeAt(this.position);
                if (newSource)
                    newSource = newSource.withoutGraphemeAt(
                        this.position + offset,
                    );
                return newSource === undefined
                    ? undefined
                    : [
                          newSource,
                          new Caret(
                              newSource,
                              Math.max(0, this.position + offset),
                              undefined,
                              undefined,
                              undefined,
                          ),
                      ];
            } else {
                const newSource = this.source.withoutGraphemeAt(
                    this.position + offset,
                );

                // Only allow valid edits? First, see if the edit is valid.
                // If it's not, select the node that would be deleted, as a form of confirmation.
                if (
                    validOnly &&
                    newSource !== undefined &&
                    project
                        .withSource(this.source, newSource)
                        .getMajorConflictsNow().length >
                        project.getMajorConflictsNow().length
                ) {
                    // Find the first non-token in the before/after.
                    const { before, after } = this.getNodesBetween();
                    const candidate = (forward ? after : before).find(
                        (n) => !(n instanceof Token),
                    );
                    if (candidate) return this.withPosition(candidate);
                }

                return newSource === undefined
                    ? undefined
                    : [
                          newSource,
                          new Caret(
                              newSource,
                              Math.max(0, this.position + offset),
                              undefined,
                              undefined,
                              undefined,
                          ),
                      ];
            }
        }
        // If it's a node, replace it with a placeholder, or delete it.
        else if (isNode(this.position)) {
            // Get the parent of the node.
            const node = this.position;
            const parent = this.source.root.getParent(node);

            // Is the parent a wrapper and the node is a block delimiter? Unwrap it.
            if (
                parent instanceof Block &&
                (node === parent.open || node === parent.close) &&
                !parent.isRoot() &&
                parent.statements.length === 1
            ) {
                return [
                    this.source.replace(parent, parent.statements[0]),
                    this.withPosition(parent.statements[0]),
                ];
            }
            // Is the parent a list or set with a single element amd the deletion is one of it's delimiters? Unwrap the list or set.
            else if (
                (parent instanceof ListLiteral ||
                    parent instanceof SetLiteral) &&
                parent.values.length === 1 &&
                (this.position === parent.open ||
                    this.position === parent.close)
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
                    // If the selected node is a program, replace it with an empty program, and replace its preceding space with nothing.
                    else if (node instanceof Program) {
                        return [
                            this.source
                                .replace(node, Program.make())
                                .withSpaces(new Spaces(this.source, new Map())),
                            this.withPosition(0).withAddition(undefined),
                        ];
                    }
                    // Is the parent an expression with a single token and its field accepts expressions? Replace the parent.
                    else if (
                        kind.allowsKind(Expression) &&
                        parent instanceof Expression &&
                        node instanceof Token &&
                        parent.hasOneLeaf()
                    ) {
                        const placeholder = ExpressionPlaceholder.make();
                        return [
                            this.source.replace(
                                parent,
                                ExpressionPlaceholder.make(),
                            ),
                            this.withPosition(placeholder).withAddition(
                                undefined,
                            ),
                        ];
                    }
                    // If the node allows and requires an expression, replace it with an expression placeholder, since it's required,
                    // unless it's already an expression placeholder.
                    else if (
                        !(node instanceof ExpressionPlaceholder) &&
                        !(kind instanceof ListOf) &&
                        kind.allowsKind(Expression)
                    ) {
                        const placeholder = ExpressionPlaceholder.make();
                        return [
                            this.source.replace(node, placeholder),
                            this.withPosition(placeholder).withAddition(
                                undefined,
                            ),
                        ];
                    }
                    // Otherwise, delete the sequence of characters if allowed.
                    else if (last !== undefined) {
                        return this.deleteNode(node, validOnly, project);
                    }
                }
            }
            // Otherwise, do nothing.
        }
        // Range? Delete the range.
        else {
            const [start, stop] = this.position;
            // No range deletions in valid only unless both positions are in the same token.
            if (
                validOnly &&
                this.source.getTokenAt(start) !== this.source.getTokenAt(stop)
            )
                return;

            const begin = Math.min(start, stop);
            const end = Math.max(start, stop);

            const newSource = this.source.withoutGraphemesBetween(begin, end);
            if (newSource === undefined) return;
            return [
                newSource,
                this.withPosition(begin).withAddition(undefined),
            ];
        }
    }

    deleteNode(
        node: Node,
        validOnly: boolean,
        project: Project,
    ): Revision | LocaleTextAccessor {
        // If valid only, check to see if the node is in a list or represents an optional field.
        const parent = this.source.root.getParent(node);
        // Keep track if there's an empty field that has a dependency.
        let dependency: Node | Node[] | undefined = undefined;
        if (validOnly) {
            if (parent) {
                const field = parent.getFieldOfChild(node);
                if (field !== undefined) {
                    const value = parent.getField(field.name);
                    let permittingKind: FieldKind | undefined = undefined;
                    if (
                        field.kind instanceof ListOf &&
                        ((Array.isArray(value) && value.length > 1) ||
                            field.kind.allowsEmpty)
                    ) {
                        permittingKind = field.kind;
                    } else {
                        // If the deletion isn't a list with more than one element or a list that allows empty, or an emptyable field, ignore the deletion.
                        const kinds = field.kind?.enumerateFieldKinds() ?? [];
                        for (const kind of kinds) {
                            if (
                                kind instanceof ListOf &&
                                ((Array.isArray(value) && value.length > 1) ||
                                    kind.allowsEmpty)
                            ) {
                                permittingKind = kind;
                                break;
                            }
                            if (kind instanceof Empty) {
                                permittingKind = kind;
                                if (kind.dependency)
                                    dependency = parent.getField(
                                        kind.dependency.name,
                                    );
                                break;
                            }
                        }
                    }
                    if (permittingKind === undefined)
                        return (l) => l.ui.source.cursor.ignored.noDelete;
                }
            } else return (l) => l.ui.source.cursor.ignored.noDelete;
        }

        let nodesToDelete = [
            node,
            ...(Array.isArray(dependency)
                ? dependency
                : dependency
                  ? [dependency]
                  : []),
        ];
        let newSource: Source | undefined = this.source;
        let firstPosition = Math.min(
            ...nodesToDelete
                .map((n) => this.source.getNodeFirstPosition(n) ?? undefined)
                .filter((p): p is number => p !== undefined),
        );
        for (const nodeToRemove of nodesToDelete) {
            const range = newSource.getRange(nodeToRemove);
            if (range === undefined)
                return (l) => l.ui.source.cursor.ignored.noDelete;
            newSource = newSource.withoutGraphemesBetween(range[0], range[1]);
            if (newSource === undefined)
                return (l) => l.ui.source.cursor.ignored.noDelete;
        }

        if (firstPosition === undefined)
            return (l) => l.ui.source.cursor.ignored.noDelete;

        // If only valid, ensure the edit is valid.
        if (
            validOnly &&
            project.getNewConflicts(this.source, newSource, NegligibleConflicts)
                .length > 0
        )
            return (l) => l.ui.source.cursor.ignored.noError;

        return [
            newSource,
            new Caret(
                newSource,
                firstPosition,
                undefined,
                undefined,
                undefined,
            ),
        ];
    }

    moveVertical(direction: 1 | -1): Edit | undefined {
        if (isNode(this.position)) {
            const position = this.source.getNodeFirstPosition(this.position);
            if (position === undefined) return;
            return this.getVertical(direction, position);
        } else
            return this.getVertical(
                direction,
                isPosition(this.position) ? this.position : this.position[0],
            );
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
            this.column,
        );

        return newPosition !== undefined
            ? this.withPosition(newPosition, this.column)
            : undefined;
    }

    wrap(project: Project, key: string): Revision | undefined {
        let node = this.position instanceof Node ? this.position : undefined;
        if (node instanceof Token && !node.isSymbol(Sym.End))
            node = this.source.root.getParent(node);
        if (node === undefined || !(node instanceof Expression))
            return undefined;
        let wrapper: Expression | undefined = undefined;
        let position: Expression | undefined;

        // Tokenize the insertion
        const token = tokens(key)[0];
        if (token === undefined) return;

        // Wrap in a block
        if (token.isSymbol(Sym.EvalOpen)) wrapper = Block.make([node]);
        // Wrap in a list
        else if (token.isSymbol(Sym.ListOpen))
            wrapper = ListLiteral.make([node]);
        // Wrap in a set
        else if (token.isSymbol(Sym.SetOpen)) wrapper = SetLiteral.make([node]);
        // Wrap in a binary evlauate if an operator
        else if (token.isSymbol(Sym.Operator)) {
            const context = project.getNodeContext(node);
            const type = node.getType(context);
            const definition = type.getDefinitionOfNameInScope(key, context);
            if (
                definition &&
                definition instanceof FunctionDefinition &&
                definition.inputs.length === 1
            ) {
                position = ExpressionPlaceholder.make();
                wrapper = new BinaryEvaluate(
                    node,
                    Reference.make(key),
                    position,
                );
            }
        }
        if (wrapper === undefined) return;

        const newSource = this.source.replace(node, wrapper);
        return [
            newSource,
            this.withSource(newSource)
                .withAddition(wrapper)
                .withPosition(position ?? wrapper),
        ];
    }

    adjustLiteral(node: Node | undefined, direction: -1 | 1): Edit | undefined {
        // Find the token we're at
        const token = node
            ? node
            : isPosition(this.position)
              ? (this.tokenExcludingSpace ?? this.tokenPrior)
              : isRange(this.position)
                ? undefined
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
        context: Context,
    ): string {
        const locales = context.getBasis().locales;

        /** Get description of conflicts */
        const conflictDescription =
            conflicts.length > 0
                ? locales
                      .concretize((l) => l.ui.edit.conflicts, conflicts.length)
                      .toText()
                : undefined;

        return `${this.getPositionDescription(type, context)}${
            conflictDescription ? `, ${conflictDescription}` : ''
        }`;
    }

    getPositionDescription(type: Type | undefined, context: Context) {
        const locales = context.getBasis().locales;

        /** If a node was added, describe the addition. */
        if (this.addition) {
            return locales
                .concretize(
                    (l) => l.ui.edit.node,
                    new NodeRef(this.addition, locales, context),
                    type ? new NodeRef(type, locales, context) : undefined,
                )
                .toText();
        }

        /** If the caret is a node, describe the node. */
        if (isNode(this.position)) {
            return locales
                .concretize(
                    (l) => l.ui.edit.node,
                    new NodeRef(this.position, locales, context),
                    type ? new NodeRef(type, locales, context) : undefined,
                )
                .toText();
        }

        /** If the position is a range, describe the start and end token */
        if (isRange(this.position)) {
            const [start, end] = this.position;
            return locales
                .concretize((l) => l.ui.edit.range, start, end)
                .toText();
        }

        const { before, after } = this.getNodesBetween();
        const beforeNode = before[0];
        const afterNode = after[0];

        // Inside a token? Say what text we're in and what characters we're between.
        if (this.tokenExcludingSpace) {
            // Where is the cursor in the token, relative to the token's start?
            const tokenPosition = this.source.getTokenTextPosition(
                this.tokenExcludingSpace,
            );
            const relativeIndex =
                tokenPosition === undefined
                    ? undefined
                    : this.position - tokenPosition;
            return locales
                .concretize(
                    (l) => l.ui.edit.inside,
                    new NodeRef(this.tokenExcludingSpace, locales, context),
                    // Character before cursor, if there is one
                    relativeIndex
                        ? this.tokenExcludingSpace.text.at(relativeIndex - 1)
                        : undefined,
                    // Character after cursor, if there is one
                    relativeIndex
                        ? this.tokenExcludingSpace.text.at(relativeIndex)
                        : undefined,
                )
                .toText();
        }
        // Describe the empty line
        else if (this.isEmptyLine()) {
            return locales
                .concretize(
                    (l) => l.ui.edit.line,
                    beforeNode
                        ? new NodeRef(beforeNode, locales, context)
                        : undefined,
                    afterNode
                        ? new NodeRef(afterNode, locales, context)
                        : undefined,
                )
                .toText();
        }
        // Describe the tokens we're between or before.
        else if (this.tokenIncludingSpace) {
            if (this.tokenPrior && this.tokenPrior !== this.tokenIncludingSpace)
                return locales
                    .concretize(
                        (l) => l.ui.edit.between,
                        beforeNode
                            ? new NodeRef(beforeNode, locales, context)
                            : undefined,
                        afterNode
                            ? new NodeRef(afterNode, locales, context)
                            : undefined,
                    )
                    .toText();
            else
                return locales
                    .concretize(
                        (l) => l.ui.edit.before,
                        afterNode
                            ? new NodeRef(afterNode, locales, context)
                            : undefined,
                    )
                    .toText();
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
            (a): a is LanguageTagged => a instanceof LanguageTagged,
        );
        return text?.language?.getLanguageCode();
    }

    /** Toggles an elision at the current position */
    elide(): Edit | undefined {
        const source = this.source;
        const code = source.getCode();

        // If it's a position...
        if (this.isPosition()) {
            // Check if the position is inside an elision, including the directly before and after the elision symbols.
            const token = source.getTokenWithSpaceAt(this.position);
            // Is the caret at a position inside an elision? Unwrap any elisions.
            if (token) {
                const space = source.getSpaces().getSpace(token);
                if (space.indexOf(ELISION_SYMBOL) >= 0) {
                    const start = source.getNodeFirstPosition(token);
                    const end = source.getNodeLastPosition(token);
                    if (start !== undefined && end !== undefined)
                        return [
                            source.withCode(
                                code.substring(
                                    0,
                                    start -
                                        new UnicodeString(space).getLength(),
                                ) +
                                    space.replaceAll(ELISION_SYMBOL, '') +
                                    code.substring(start, code.getLength()),
                            ),
                            this.withPosition(this.position - 1),
                        ];
                    else return undefined;
                }
            }
        }

        // If this is a node, elide the node, otherwise, find the first expression parent of the token we're at, excluding space.
        const node = this.isNode()
            ? this.position
            : this.tokenExcludingSpace
              ? this.source.root
                    .getAncestors(this.tokenExcludingSpace)
                    .find((n) => n instanceof Expression)
              : undefined;

        /** The caret is a node selection, elide the node. */
        if (node) {
            const start = source.getNodeFirstPosition(node);
            const end = source.getNodeLastPosition(node);
            if (start !== undefined && end !== undefined) {
                return [
                    source.withCode(
                        code.substring(0, start) +
                            ELISION_SYMBOL +
                            code.substring(start, end) +
                            ELISION_SYMBOL +
                            code.substring(end, code.getLength()),
                    ),
                    this.withPosition(start + 1),
                ];
            }
        } else if (this.isPosition())
            // If it's not, insert a new elision and place the caret inside it.
            return [
                source.withCode(
                    code.substring(0, this.position) +
                        ELISION_SYMBOL +
                        ELISION_SYMBOL +
                        code.substring(this.position, code.getLength()),
                ),
                this.withPosition(this.position + 1),
            ];
    }
}
