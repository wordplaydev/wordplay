import Node, { node, type Grammar, type Replacement } from './Node';
import Token from './Token';
import Program from './Program';
import type Conflict from '@conflicts/Conflict';
import parseProgram from '@parser/parseProgram';
import {
    DelimiterCloseByOpen,
    DelimiterOpenByClose,
    tokenize,
} from '@parser/Tokenizer';
import UnicodeString from '../models/UnicodeString';
import type Value from '@values/Value';
import type Context from './Context';
import Names from './Names';
import type Borrow from './Borrow';
import Expression from './Expression';
import Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import type Step from '@runtime/Step';
import type { SharedDefinition } from './Borrow';
import FunctionDefinition from './FunctionDefinition';
import StructureDefinition from './StructureDefinition';
import type Spaces from '@parser/Spaces';
import NoneValue from '@values/NoneValue';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Root from './Root';
import Markup from './Markup';
import Purpose from '../concepts/Purpose';
import Tokens from '../parser/Tokens';
import type Definition from './Definition';
import type Locales from '../locale/Locales';
import type Evaluator from '@runtime/Evaluator';

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source extends Expression {
    readonly code: UnicodeString;

    /** The names of this source */
    readonly names: Names;

    /** The program this source can evaluate. */
    readonly expression: Program;

    /** The tokens of this program */
    readonly tokens: Token[];

    /** The spaces preceding each token in the program. */
    readonly spaces: Spaces;

    /** Functions to call when a source's evaluator has an update. */
    readonly observers: Set<() => void> = new Set();

    /** An index of token positions in the source file. */
    readonly tokenPositions: Map<Token, number> = new Map();

    /** An index of this tree for analyzing structure */
    readonly root: Root;

    constructor(
        names: string | Names,
        code: string | UnicodeString | [Program, Spaces],
    ) {
        super();

        this.names = names instanceof Names ? names : Names.make([names]);

        if (typeof code === 'string' || code instanceof UnicodeString) {
            // Generate the AST from the provided code.
            const tokens = tokenize(
                code instanceof UnicodeString ? code.getText() : code,
            );
            this.tokens = tokens.getTokens();
            this.expression = parseProgram(
                new Tokens(this.tokens, tokens.getSpaces()),
            );
            this.root = new Root(this);
            this.spaces = tokens.getSpaces().withRoot(this);
        } else {
            // Save the AST provided
            const [program, spaces] = code;
            this.expression = program;
            this.tokens = program.leaves() as Token[];
            this.root = new Root(this);
            this.spaces = spaces.withRoot(this);
        }

        // Generate the text from the AST, which is responsible for pretty printing.
        this.code = new UnicodeString(this.expression.toWordplay(this.spaces));

        // Create an index of the token positions and space roots.
        let index = 0;
        for (const token of this.expression.nodes(
            (n): n is Token => n instanceof Token,
        )) {
            // Increment by the amount of space
            index += this.spaces.getSpace(token).length;
            // Remember the position.
            this.tokenPositions.set(token, index);
            // Increment by the amount of text.
            index += token.text.getLength();
        }
    }

    static make(mainName: string) {
        return new Source(Names.make([mainName]), '');
    }

    /** Used by Evaluator to get the steps for the evaluation of this source file. */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression.compile(evaluator, context);
    }

    getDescriptor() {
        return 'Source';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'expression',
                kind: node(Program),
                space: false,
                indent: false,
            },
        ];
    }

    getSpaces() {
        return this.spaces;
    }

    isEvaluationInvolved() {
        return true;
    }

    isEvaluationRoot() {
        return true;
    }

    /** Only equal if the same source */
    isEquivalentTo(definition: Definition) {
        return definition === this;
    }

    has(node: Node) {
        return this.root.has(node);
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    /** Returns a path from a borrow in this program this to this, if one exists. */
    getCycle(
        context: Context,
        path: Source[] = [],
    ): [Borrow, Source[]] | undefined {
        // Visit this source.
        path.push(this);

        // Visit each borrow in the source's program to see if there's a path back here.
        for (const borrow of this.expression.borrows) {
            // Find the share.
            const [source] = borrow.getShare(context) ?? [];
            if (source) {
                // If we found a cycle, return the path.
                if (path.includes(source)) return [borrow, path];
                // Otherwise, continue searching for a cycle.
                const cycle = source.getCycle(context, path.slice());
                // If we found one, pass it up the call stack, but pass up this borrow instead
                if (cycle) return [borrow, cycle[1]];
            }
        }

        // We made it without detecting a cycle; return undefined.
        return;
    }

    getNames() {
        return this.names.getNames();
    }
    getCode() {
        return this.code;
    }

    getShare(name: string): SharedDefinition | undefined {
        return this.getShares().find((s) => s.hasName(name));
    }

    getShares(): SharedDefinition[] {
        return this.expression.expression.statements.filter(
            (n): n is Bind | FunctionDefinition | StructureDefinition =>
                (n instanceof Bind && n.isShared()) ||
                (n instanceof FunctionDefinition && n.isShared()) ||
                (n instanceof StructureDefinition && n.isShared()),
        );
    }

    getMatchedDelimiter(anchor: Token): Token | undefined {
        const text = anchor.getText();
        const match =
            text in DelimiterCloseByOpen
                ? DelimiterCloseByOpen[text]
                : text in DelimiterOpenByClose
                  ? DelimiterOpenByClose[text]
                  : undefined;
        if (match === undefined) return;
        return this.root
            .getParent(anchor)
            ?.getChildren()
            .find(
                (node): node is Token =>
                    node instanceof Token && node.getText() === match,
            );
    }

    getUnmatchedDelimiter(anchor: Token, delimiter: string): Token | undefined {
        const open =
            delimiter in DelimiterCloseByOpen
                ? DelimiterCloseByOpen[delimiter]
                : undefined;
        if (open === undefined) return;

        const ancestors = this.root.getAncestors(anchor);
        let next = ancestors.shift();
        while (next !== undefined) {
            const match = next
                .getChildren()
                .find(
                    (child): child is Token =>
                        child instanceof Token &&
                        child !== anchor &&
                        child.getText() === open,
                );
            if (match && this.getMatchedDelimiter(match) === undefined)
                return match;
            next = ancestors.shift();
        }

        return undefined;
    }

    withName(name: string, locale: Locale) {
        return new Source(this.names.withName(name, locale.language), [
            this.expression,
            this.spaces,
        ]);
    }

    withSpaces(spaces: Spaces) {
        return new Source(this.names, [this.expression, spaces]);
    }

    withPreviousGraphemeReplaced(char: string, position: number) {
        const newCode = this.code.withPreviousGraphemeReplaced(char, position);
        return newCode === undefined
            ? undefined
            : this.reparse(newCode.toString());
    }

    withGraphemesAt(char: string, position: number) {
        const newCode = this.code.withGraphemesAt(char, position);
        return newCode == undefined
            ? undefined
            : this.reparse(newCode.toString());
    }

    withoutGraphemeAt(position: number) {
        const newCode = this.code.withoutGraphemeAt(position);
        return newCode == undefined
            ? undefined
            : this.reparse(newCode.toString());
    }

    withoutGraphemesBetween(start: number, endExclusive: number) {
        const newCode = this.code.withoutGraphemesBetween(start, endExclusive);
        return newCode == undefined
            ? undefined
            : this.reparse(newCode.toString());
    }

    getGraphemeAt(index: number) {
        return this.code.at(index);
    }

    /**
     * Given a new program, construct a new source that reuses as many existing Nodes as possible.
     * This isn't really optimized for parsing speed as much as it is reuse, since responsiveness is
     * dominated by the UI, not by parsing, since programs are small.
     * */
    reparse(newCode: string): Source {
        // Tokenize the new text
        const tokenList = tokenize(newCode);
        const newTokens = tokenList.getTokens();
        const newSpaces = tokenList.getSpaces();

        // Make a mutable list of the old tokens
        const oldTokens = [...this.tokens];
        const added: Token[] = [];
        const removed: Token[] = [];

        // Scan through the new tokens, reusing as many tokens as possible.
        // let reused = 0;
        for (let i = 0; i < newTokens.length; i++) {
            const newToken = newTokens[i];
            // Search the existing tokens for a match, and if we find one, discard everything prior
            const index = oldTokens.findIndex((old) => old.isEqualTo(newToken));
            if (index >= 0) {
                // reused++;
                const oldToken = oldTokens[index];
                // Replace the new token with the old token
                newTokens[i] = oldToken;
                // Point the new spaces to the old token
                newSpaces.replace(newToken, oldToken);
                // Remember what we're about to remove
                for (let j = 0; j < index; j++) removed.push(oldTokens[j]);
                // Rid of all the tokens prior to the reused one, since they're obsolete.
                oldTokens.splice(0, index + 1);
            } else {
                // Add this to the added list.
                added.push(newToken);
            }
        }

        // FOR DEBUGGING
        // console.log(`${reused}/${newTokens.length} tokens reused`);

        // Try to reuse as many Nodes as possible by parsing the program with revised tokens, then identifying
        // subtrees that are equivalent in the old and new tree, then recycling them in the new tree. Equivalence is defined as any node
        // that has an referentially identical sequence of Tokens and is of the same type.
        let newProgram = parseProgram(new Tokens(newTokens, newSpaces));

        // Make an empty list of replacements.
        const replacements: [Node, Node][] = [];

        // Create a set of all of the old program's nodes, except the program itself.
        const unmatchedOldNodes = new Set(this.expression.traverseTopDown());
        unmatchedOldNodes.delete(this.expression);
        // Create a list of new nodes to iterate through to find matches. Skip the program, which always changes.
        const newNodes = newProgram.traverseTopDown();
        newNodes.shift();
        // Remember what we've matched so we don't redundantly match subtrees.
        const matched = new Set<Node>();
        // Cache old node token ID sequences for speed.
        const oldNodeTokenIDSequences = new Map<Node, string>();

        // Iterate through all of the new nodes in the program
        for (const newNode of newNodes) {
            // If we've already matched this node, skip it. Also skip the program; it always changes and is large.
            if (matched.has(newNode)) continue;
            // Get the (likely cached) tokens in the new node
            const newTokens = newNode.hash();
            // Iterate through all of the unmatched old nodes to see if there's a match.
            let match = undefined;
            for (const oldNode of unmatchedOldNodes) {
                if (newNode.constructor === oldNode.constructor) {
                    const oldTokens =
                        oldNodeTokenIDSequences.get(oldNode) ?? oldNode.hash();
                    if (oldTokens === newTokens) {
                        match = oldNode;
                        break;
                    }
                }
            }
            if (match) {
                // Remove all nodes in the match from the search.
                for (const node of match.traverseTopDown())
                    unmatchedOldNodes.delete(node);
                // Mark all nodes in the matched new node as matched, so we don't try to find matches for them.
                for (const node of newNode.traverseTopDown()) matched.add(node);
                // Remember the replacement.
                replacements.push([match, newNode]);
            }
            // FOR DEBUGGING
            // else {
            //     console.log(
            //         `Couldn't find match for ${
            //             newNode.getDescriptor()
            //         } ${newNode.toWordplay()}`
            //     );
            // }
        }

        // If we found old subtrees to preserve, replace them in the new tree.
        while (replacements.length > 0) {
            const next = replacements.shift();
            if (next) {
                const [oldTree, newTree] = next;
                newProgram = newProgram.replace(newTree, oldTree);
            }
        }

        // FOR DEBUGGING
        // const original = this.expression.traverseTopDown();
        // const revised = newProgram.traverseTopDown();
        // const news = revised.filter((n) => !original.includes(n));
        // console.log(`${news.length} new nodes`);
        // for (const node of news)
        //     console.log(node.getDescriptor() + ' ' + node.toWordplay());

        // Otherwise, reparse the program with the reused tokens and return a new source file
        return new Source(this.names, [newProgram, newSpaces]);
    }

    withCode(code: string) {
        return new Source(this.names, new UnicodeString(code));
    }

    withProgram(program: Program, spaces: Spaces) {
        return new Source(this.names, [program, spaces]);
    }

    clone(replace?: Replacement) {
        // If replacing, we need to clone the spaces as well.
        if (
            replace &&
            replace.original instanceof Node &&
            (replace.replacement instanceof Node ||
                replace.replacement === undefined)
        ) {
            const newSource = new Source(this.names, [
                this.replaceChild('expression', this.expression, replace),
                this.spaces.withReplacement(
                    replace.original,
                    replace.replacement,
                ),
            ]);

            // Pretty print the replaced node, if there is one.
            return (
                replace.replacement
                    ? newSource.withSpaces(
                          newSource.spaces.withPreferredSpaceForNode(
                              newSource.root,
                              replace.replacement,
                          ),
                      )
                    : newSource
            ) as this;
        } else
            return new Source(this.names, [
                this.expression,
                this.spaces,
            ]) as this;
    }

    getTokenTextPosition(token: Token): number | undefined {
        return this.tokenPositions.get(token);
    }

    getTokenSpacePosition(token: Token) {
        const index = this.getTokenTextPosition(token);
        return index !== undefined
            ? index - this.spaces.getSpace(token).length
            : undefined;
    }
    getTokenLastPosition(token: Token) {
        const index = this.getTokenTextPosition(token);
        return index !== undefined ? index + token.getTextLength() : undefined;
    }

    getEndOfTokenLine(token: Token) {
        let position = this.getTokenTextPosition(token);
        if (position === undefined) return undefined;
        while (
            position < this.code.getLength() &&
            this.code.at(position) !== '\n'
        )
            position++;
        return position;
    }

    getStartOfTokenLine(token: Token) {
        let position = this.getTokenTextPosition(token);
        if (position === undefined) return undefined;
        while (position > 0 && this.code.at(position) !== '\n') position--;
        if (position > 0) {
            position++;
            while (
                this.code.at(position) === ' ' ||
                this.code.at(position) === '\t'
            )
                position++;
        }
        return position;
    }

    /** Given a node in this source, return the line the node is on */
    getLine(position: number | Node): number | undefined {
        if (position instanceof Node) {
            const leaf = position.getFirstLeaf();
            if (leaf === undefined) return undefined;

            // Iterate through all of the tokens in order
            let count = 0;
            for (const token of this.leaves()) {
                count +=
                    this.spaces.getSpace(token as Token).split('\n').length - 1;
                if (leaf === token) return count;
            }
            return undefined;
        } else {
            return (
                this.code.substring(0, position).toString().split('\n').length -
                1
            );
        }
    }

    scanLines<Result>(
        checker: (
            line: number,
            column: number,
            physical: number,
            actualSpace: string,
            renderedSpace: string,
            text: string,
            textLength: number,
            lastOnLine: boolean,
        ) => Result | undefined,
    ): Result | undefined {
        const tokens = this.leaves() as Token[];

        // Track the rendered line, rendered column, and physical index.
        // "Physical" here means the text string that repreesents the program in memory
        // as opposed to how it is rendered.
        let line = 0;
        let column = 0;
        let physical = 0;

        // Iterate through the tokens in the program.
        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index];
            const tokenLength = token.getTextLength();

            // Get rendered space prior to the token.
            const renderedSpace = this.spaces.getPreferredTokenSpace(
                this.root,
                token,
            );
            // Get the physical space prior to the token.
            const actualSpace = this.spaces.getSpace(token);

            // Get the space before each line break.
            const lineSpaces = renderedSpace.split('\n');
            // Compute the number of lines in the preceding rendered space.
            const lineCount = lineSpaces.length - 1;
            // Compute the space on the final line prior to the token text.
            const lastLineSpace = lineSpaces[lineSpaces.length - 1];

            // Evaluate this token and return its result if not undefined.
            const result = checker(
                line,
                column,
                physical,
                actualSpace,
                renderedSpace,
                token.getText(),
                tokenLength,
                // Last on line if the last token
                index + 1 === tokens.length ||
                    // Or the next token has a line break before it.
                    this.spaces
                        .getPreferredTokenSpace(this.root, tokens[index + 1])
                        .includes('\n'),
            );
            if (result !== undefined) return result;

            // Increment the lines and columns based on the rendered position.
            line += lineCount;
            column =
                lineCount > 0
                    ? // Set the column to the length of the last line of space plus the token's length.
                      lastLineSpace.length + tokenLength
                    : // Increment the column by the rendered length of space and text.
                      column + renderedSpace.length + tokenLength;

            // Increment the physical position based on actual space and token.
            physical += actualSpace.length + tokenLength;
        }

        // Nothing matched? Return undefined.
        return undefined;
    }

    getRenderedLineAndColumnFromPhysicalPosition(
        position: number,
    ): [number, number] | undefined {
        return this.scanLines(
            (
                line: number,
                column: number,
                physical: number,
                actualSpace: string,
                renderedSpace: string,
                text: string,
                textLength: number,
            ) => {
                // If this token and it's space contains the physical position, find the corresponding line and column.
                if (
                    physical <= position &&
                    position <= physical + actualSpace.length + textLength
                ) {
                    // Find the rendered text prior to the position, including rendered lines
                    const textBeforePosition = (renderedSpace + text).substring(
                        0,
                        position - physical,
                    );
                    // Split the text before into lines.
                    const linesBefore = textBeforePosition.split('\n');
                    return [
                        // Our line is the current line plus the number of lines before the position.
                        line + linesBefore.length - 1,
                        // Our column is ...
                        linesBefore.length > 1
                            ? // If there are line breaks, the number of them plus the length of the text on the last line.
                              linesBefore[linesBefore.length - 1].length
                            : // If no line breaks, increment by the length of the text before position
                              column + textBeforePosition.length,
                    ];
                }
                return undefined;
            },
        );
    }

    getColumn(position: number) {
        const match =
            this.getRenderedLineAndColumnFromPhysicalPosition(position);
        return match ? match[1] : undefined;
    }

    getPhysicalPositionFromLineAndColumn(
        preferredLine: number,
        preferredColumn: number,
    ): number | undefined {
        return this.scanLines(
            (
                line: number,
                column: number,
                physical: number,
                actualSpace: string,
                renderedSpace: string,
                text: string,
                textLength: number,
                lastOnLine: boolean,
            ) => {
                // Get the space prior to each rendered line break.
                const renderedSpacesBeforeBreaks = renderedSpace.split('\n');
                const actualSpacesBeforeBreaks = actualSpace.split('\n');

                // Check if there are any inserted lines
                let extraLines =
                    renderedSpacesBeforeBreaks.length -
                    1 -
                    (actualSpacesBeforeBreaks.length - 1);

                // Remember the starting position
                const originalPhysical = physical;

                // Scan through each line except the last, updating the lines, columns, and physical position.
                for (
                    let index = 0;
                    index < renderedSpacesBeforeBreaks.length - 1;
                    index++
                ) {
                    const spaceBeforeBreak = renderedSpacesBeforeBreaks[index];
                    // If this line matches and
                    if (
                        line === preferredLine &&
                        // If the preferred column is between the current column and the end of the space.
                        column <= preferredColumn &&
                        // Within column or this is end of line (there is one more line after this)
                        (preferredColumn <= column + spaceBeforeBreak.length ||
                            index < renderedSpacesBeforeBreaks.length - 1)
                    )
                        // Return the current physical position plus the number of physical lines
                        // BUG This includes any space that's rendered only
                        return (
                            physical +
                            Math.min(
                                preferredColumn - column,
                                spaceBeforeBreak.length,
                            )
                        );
                    // Advance to the next line, accounting for this line break.
                    line++;
                    // Reset the column to the start
                    column = 0;
                    // Advancing physical by the length of the text on the line, plus the line break
                    physical +=
                        spaceBeforeBreak.length + (extraLines > 0 ? 0 : 1);
                    // Account for the extra line, so we start adding physical lines.
                    if (extraLines > 0) extraLines--;
                }

                // Get the last space on the last line.
                const lastLineRenderedSpace =
                    renderedSpacesBeforeBreaks[
                        renderedSpacesBeforeBreaks.length - 1
                    ].length;
                const lastLineActualSpace =
                    actualSpacesBeforeBreaks[
                        actualSpacesBeforeBreaks.length - 1
                    ].length;

                // Reset the physical position to the original, plus the actual preceding space.
                physical =
                    originalPhysical + actualSpace.length - lastLineActualSpace;

                // Are we on the right line and the text contains the column, or its the end of the line?
                if (
                    line === preferredLine &&
                    column <= preferredColumn &&
                    (preferredColumn <=
                        column + lastLineRenderedSpace + textLength ||
                        lastOnLine)
                )
                    // Advance by the smaller of the preferred column position and the end of the line.
                    return (
                        physical +
                        Math.min(
                            preferredColumn - column,
                            lastLineActualSpace + textLength,
                        )
                    );
            },
        );
    }

    getTokenAt(position: number, includingWhitespace = true) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for (const [token, index] of this.tokenPositions) {
            if (
                position >=
                    index -
                        (includingWhitespace
                            ? this.spaces.getSpace(token).length
                            : 0) &&
                (position < index + token.getTextLength() ||
                    token === this.tokens[this.tokens.length - 1])
            )
                return token;
        }
        return undefined;
    }

    getTokenWithSpaceAt(position: number) {
        // This could be faster with binary search, but let's not prematurely optimize.
        for (const [token] of this.tokenPositions)
            if (this.tokenSpaceContains(token, position)) return token;
        return undefined;
    }

    tokenSpaceContains(token: Token, position: number) {
        const index = this.getTokenTextPosition(token);
        if (index === undefined) return false;
        return (
            position >= index - this.spaces.getSpace(token).length &&
            position <= index
        );
    }

    getTokenBefore(token: Token) {
        return this.getNextToken(token, -1);
    }

    getTokenAfter(token: Token) {
        return this.getNextToken(token, 1);
    }

    getTokensBefore(token: Token) {
        const tokens = this.expression.nodes(
            (n): n is Token => n instanceof Token,
        );
        const index = tokens.indexOf(token);
        if (index < 0) return undefined;
        else return tokens.slice(0, index);
    }

    getNextToken(token: Token, direction: -1 | 1): Token | undefined {
        const tokens = this.expression.nodes(
            (n): n is Token => n instanceof Token,
        );
        const index = tokens.indexOf(token);

        if (direction < 0 && index <= 0) return undefined;
        if (direction > 0 && index >= tokens.length - 1) return undefined;
        return tokens[index + direction];
    }

    getTokenBeforeNode(node: Node): Token | undefined {
        let lastToken = undefined;
        for (const next of this.nodes()) {
            if (next instanceof Token) lastToken = next;
            if (next === node) return lastToken;
        }
        return undefined;
    }

    getTokenAfterNode(node: Node): Token | undefined {
        let found = false;
        for (const next of this.nodes()) {
            if (found && next instanceof Token) return next;
            if (next === node) found = true;
        }
        return undefined;
    }

    getNodeFirstPosition(node: Node) {
        const firstToken = this.getFirstToken(node);
        if (firstToken && this.tokenPositions.has(firstToken))
            return this.getTokenTextPosition(firstToken);
        const tokenBefore = this.getTokenBeforeNode(node);
        return tokenBefore === undefined
            ? undefined
            : this.getTokenLastPosition(tokenBefore);
    }

    getNodeLastPosition(node: Node) {
        const lastToken = this.getLastToken(node);
        if (lastToken && this.tokenPositions.has(lastToken))
            return this.getTokenLastPosition(lastToken);
        const tokenAfter = this.getTokenAfterNode(node);
        return tokenAfter === undefined
            ? undefined
            : this.getTokenTextPosition(tokenAfter);
    }

    getFirstToken(node: Node): Token | undefined {
        let next = node;
        do {
            if (next instanceof Token) return next;
            next = next.getChildren()[0];
        } while (next !== undefined);
        return undefined;
    }

    getLastToken(node: Node): Token | undefined {
        let next = node;
        do {
            if (next instanceof Token) return next;
            const children = next.getChildren();
            next = children[children.length - 1];
        } while (next !== undefined);
        return undefined;
    }

    getTokens() {
        return this.tokens;
    }

    getTokensAfter(token: Token) {
        const tokensAfter = this.getTokens();
        const indexOfCurrentToken = tokensAfter.indexOf(token);
        return indexOfCurrentToken < 0
            ? []
            : tokensAfter.slice(indexOfCurrentToken + 1);
    }

    /** True if the program is a mere end token */
    isEmpty(): boolean {
        return this.expression.isEmpty();
    }

    isEmptyLine(position: number) {
        // Only offer suggestions on empty newlines.
        // An empty line is one for which every character before and after until the next new line is only a space or tab
        let current = position;
        let empty = true;
        let next: string | undefined;
        do {
            current--;
            next = this.code.at(current);
        } while (next !== undefined && (next === ' ' || next === '\t'));
        if (next !== '\n') empty = false;
        else {
            current = position;
            do {
                next = this.code.at(current);
                current++;
            } while (next !== undefined && (next === ' ' || next === '\t'));
            if (next !== '\n' && next !== undefined) empty = false;
        }
        return empty;
    }

    withPreferredSpace() {
        // Pretty print and get the column
        return this.withSpaces(this.spaces.withPreferredSpace(this));
    }

    toWordplay(spaces?: Spaces) {
        return super.toWordplay(spaces ?? this.spaces);
    }

    getPreferredName(locales: Locale | Locale[]) {
        return this.names.getPreferredNameString(locales);
    }

    computeType(context: Context): Type {
        return this.expression.getType(context);
    }
    getDependencies(): Expression[] {
        return [this.expression];
    }
    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    compile(): Step[] {
        return [];
    }

    evaluate(): Value {
        return new NoneValue(this);
    }

    getStart() {
        return this;
    }
    getFinish() {
        return this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Source);
    }

    getStartExplanations() {
        return new Markup([]);
    }

    getFinishExplanations() {
        return new Markup([]);
    }

    getGlyphs() {
        return Glyphs.Source;
    }

    getPurpose() {
        return Purpose.Source;
    }
}
