import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { KeywordIndex } from '@parser/Keywords';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { parseNames } from '@parser/parseBind';
import parseProgram from '@parser/parseProgram';
import type Spaces from '@parser/Spaces';
import {
    DelimiterCloseByOpen,
    DelimiterOpenByClose,
    tokenize,
} from '@parser/Tokenizer';
import { toTokens } from '@parser/toTokens';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import NoneValue from '@values/NoneValue';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import Tokens from '@parser/Tokens';
import UnicodeString from '@unicode/UnicodeString';
import Bind from '@nodes/Bind';
import type Borrow from '@nodes/Borrow';
import type { SharedDefinition } from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Markup from '@nodes/Markup';
import Names from '@nodes/Names';
import Node, { node, type Grammar, type Replacement } from '@nodes/Node';
import Program from '@nodes/Program';
import Root from '@nodes/Root';
import StructureDefinition from '@nodes/StructureDefinition';
import { Sym, type SymType } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

/** The structural bracket pairs whose nesting depth we visualize, each mapped to
 * its pair group so depth is counted independently per delimiter type. Excludes
 * separators, language tags, markup tags, and text delimiters — same set as
 * TokenView's isBracket. */
const StructuralDelimiterGroups = new Map<SymType, string>([
    [Sym.EvalOpen, 'eval'],
    [Sym.EvalClose, 'eval'],
    [Sym.ListOpen, 'list'],
    [Sym.ListClose, 'list'],
    [Sym.SetOpen, 'set'],
    [Sym.SetClose, 'set'],
    [Sym.TableOpen, 'table'],
    [Sym.TableClose, 'table'],
    [Sym.TypeOpen, 'type'],
    [Sym.TypeClose, 'type'],
]);
const StructuralOpenDelimiters = new Set<SymType>([
    Sym.EvalOpen,
    Sym.SetOpen,
    Sym.ListOpen,
    Sym.TableOpen,
    Sym.TypeOpen,
]);

/** A document representing executable Wordplay code and it's various metadata, such as conflicts, tokens, and evaulator. */
export default class Source extends Expression {
    readonly code: UnicodeString;

    /** The names of this source */
    readonly names: Names;

    /** The program this source can evaluate. */
    readonly expression: Program;

    /** The tokens of this program, in order */
    readonly tokens: Token[];

    /** The spaces preceding each token in the program. */
    readonly spaces: Spaces;

    /** The localized-keyword index used to tokenize this source (from the project's locales), if any.
     * Carried so reparses/edits keep recognizing typed keyword words; undefined = symbol-only. */
    readonly keywords: KeywordIndex | undefined;

    /** Functions to call when a source's evaluator has an update. */
    readonly observers: Set<() => void> = new Set();

    /** An index of token positions in the source file. */
    readonly tokenPositions: Map<Token, number> = new Map();

    /** An index of this tree for analyzing structure */
    readonly root: Root;

    /** Lazily-computed nesting depth of each structural bracket token; see getDelimiterDepths(). */
    private delimiterDepths: Map<Token, number> | undefined = undefined;

    /** Cache of the navigable blocks-mode caret positions (Caret.getBlockPositions).
     * That list is a pure function of this immutable Source but is recomputed on
     * every horizontal blocks-mode arrow press, so Caret stores its result here
     * once and reuses it for this Source's lifetime. */
    private blockPositions: (Node | number)[] | undefined = undefined;
    getCachedBlockPositions(): (Node | number)[] | undefined {
        return this.blockPositions;
    }
    setCachedBlockPositions(positions: (Node | number)[]): void {
        this.blockPositions = positions;
    }

    constructor(
        names: string | Names,
        code: string | UnicodeString | [Program, Spaces],
        keywords?: KeywordIndex,
    ) {
        super();

        this.keywords = keywords;

        this.names =
            names instanceof Names ? names : parseNames(toTokens(names));

        if (typeof code === 'string' || code instanceof UnicodeString) {
            // Generate the AST from the provided code.
            const tokens = tokenize(
                code instanceof UnicodeString ? code.getText() : code,
                keywords,
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
            this.tokens = program.leaves();
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
            index += new UnicodeString(this.spaces.getSpace(token)).getLength();
            // Remember the position.
            this.tokenPositions.set(token, index);
            // Increment by the amount of text.
            index += token.text.getLength();
        }
    }

    static make(mainName: string) {
        return new Source(Names.make([mainName]), '');
    }

    getParentNode(node: Node): Node | undefined {
        return this.root.getParent(node);
    }

    /** Used by Evaluator to get the steps for the evaluation of this source file. */
    getEvaluationSteps(evaluator: Evaluator, context: Context): Step[] {
        return this.expression.compile(evaluator, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'Source';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'expression',
                kind: node(Program),
                label: undefined,
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

    /**
     * Returns the nesting depth of every structural bracket token, counted
     * independently per delimiter type (outermost of each type is 0), so a
     * matching open/close pair share a depth and an inner delimiter of a
     * different type starts its own type's count rather than inheriting an
     * enclosing type's depth. Computed with a single linear scan over the
     * tokens, so it degrades gracefully on unmatched brackets, and memoized
     * since Source is immutable.
     */
    getDelimiterDepths(): Map<Token, number> {
        if (this.delimiterDepths !== undefined) return this.delimiterDepths;
        const depths = new Map<Token, number>();
        // The number of currently-open delimiters of each type group.
        const openCounts = new Map<string, number>();
        for (const token of this.tokens) {
            const types = token.getTypes();
            const group = types
                .map((type) => StructuralDelimiterGroups.get(type))
                .find((g) => g !== undefined);
            if (group === undefined) continue;
            if (types.some((type) => StructuralOpenDelimiters.has(type))) {
                const depth = openCounts.get(group) ?? 0;
                depths.set(token, depth);
                openCounts.set(group, depth + 1);
            } else {
                // Pop first so the close shares its matching open's depth;
                // clamp at 0 for unmatched closes.
                const depth = Math.max(0, (openCounts.get(group) ?? 0) - 1);
                depths.set(token, depth);
                openCounts.set(group, depth);
            }
        }
        this.delimiterDepths = depths;
        return depths;
    }

    withName(name: string, locale: LocaleText) {
        return new Source(
            this.names.withName(name, locale.language),
            [this.expression, this.spaces],
            this.keywords,
        );
    }

    withSpaces(spaces: Spaces) {
        return new Source(
            this.names,
            [this.expression, spaces],
            this.keywords,
        );
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

    getGraphemesBetween(start: number, end: number) {
        return this.code.substring(Math.min(start, end), Math.max(start, end));
    }

    /**
     * Given a new program, construct a new source that reuses as many existing Nodes as possible.
     * This isn't really optimized for parsing speed as much as it is reuse, since responsiveness is
     * dominated by the UI, not by parsing, since programs are small.
     * */
    reparse(newCode: string): Source {
        // Tokenize the new text with this source's keyword index so typed keyword words keep parsing.
        const tokenList = tokenize(newCode, this.keywords);
        const newTokens = tokenList.getTokens();
        const newSpaces = tokenList.getSpaces();

        // FAST PATH for same-shape token lists. If the new tokenization
        // produces the same number of tokens with the same Sym types in the
        // same order, and at most one differs only in text, the parser would
        // produce the same AST shape — so we can swap that one token (or
        // just the spaces) into the existing AST and skip both parseProgram
        // (full recursive descent over all tokens) and the node-reuse pass
        // below (O(N) build of the constructor+hash index plus an O(N) walk
        // of the new tree). This handles the common case of typing inside a
        // string, name, number, comment, or doc, where a single token's text
        // changes but no boundary moves. tryTextOnlyEdit returns undefined
        // if the edit doesn't qualify, falling through to the slow path.
        const fast = this.tryTextOnlyEdit(newTokens, newSpaces);
        if (fast !== undefined) return fast;

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

        // Build a (constructor → (hash → nodes)) index over the unmatched old
        // nodes so the reuse pass can find candidates by hash in O(1) instead
        // of scanning every old node for every new node. This turns the
        // overall match pass from O(N²) to O(N) on a tree with N nodes —
        // before this change, that quadratic scan was the dominant per-
        // keystroke cost on large files. (Combined with the memoized
        // Node.hash() this replaces, the overall character-of-text-edit
        // path is closer to O(N) than to O(N²).)
        const oldByConstructorAndHash = new Map<Function, Map<string, Node[]>>();
        for (const oldNode of unmatchedOldNodes) {
            let byHash = oldByConstructorAndHash.get(oldNode.constructor);
            if (byHash === undefined) {
                byHash = new Map();
                oldByConstructorAndHash.set(oldNode.constructor, byHash);
            }
            const key = oldNode.hash();
            const bucket = byHash.get(key);
            if (bucket === undefined) byHash.set(key, [oldNode]);
            else bucket.push(oldNode);
        }

        // Create a list of new nodes to iterate through to find matches. Skip the program, which always changes.
        const newNodes = newProgram.traverseTopDown();
        newNodes.shift();
        // Remember what we've matched so we don't redundantly match subtrees.
        const matched = new Set<Node>();

        // Iterate through all of the new nodes in the program
        for (const newNode of newNodes) {
            // If we've already matched this node, skip it. Also skip the program; it always changes and is large.
            if (matched.has(newNode)) continue;
            // Find the matching constructor's bucket and look up by hash.
            const byHash = oldByConstructorAndHash.get(newNode.constructor);
            const bucket = byHash?.get(newNode.hash());
            // The bucket may contain old nodes that have already been claimed
            // (because an ancestor was matched earlier and they were removed
            // from unmatchedOldNodes). Skip past any of those.
            let match: Node | undefined;
            if (bucket !== undefined) {
                while (bucket.length > 0) {
                    const candidate = bucket[0];
                    if (unmatchedOldNodes.has(candidate)) {
                        match = candidate;
                        bucket.shift();
                        break;
                    }
                    bucket.shift();
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
        }

        // If we found old subtrees to preserve, replace them in the new tree.
        while (replacements.length > 0) {
            const next = replacements.shift();
            if (next) {
                const [oldTree, newTree] = next;
                newProgram = newProgram.replace(newTree, oldTree, 'silent');
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
        return new Source(this.names, [newProgram, newSpaces], this.keywords);
    }

    /**
     * Short-circuit reparse for the common in-token edit. Qualifying edits
     * are those where the new tokenization has the same length and Sym types
     * in the same order as the existing one, with at most one token differing
     * in text — i.e., typing inside a string / name / number / comment / doc,
     * or a whitespace-only change between tokens. In those cases the parse
     * tree's shape is identical, so we can build the new Source by either
     * (a) reusing the entire AST and only swapping the Spaces map, or (b)
     * cloning the path from the program root to the one affected token and
     * reusing every other subtree by reference.
     *
     * Cost: a single pairwise walk of the two token lists (O(N) comparisons
     * with early exit) plus, for the single-token-text case, one
     * expression.replace() that clones only the depth-deep path. The full
     * reparse path that this avoids does a full parseProgram (~O(N) recursive
     * descent) plus a constructor+hash-indexed node-reuse pass (~O(N) build
     * of the index, O(N) lookups against it).
     *
     * Returns undefined if the edit doesn't qualify; the caller falls back to
     * the full reparse.
     */
    private tryTextOnlyEdit(
        newTokens: Token[],
        newSpaces: Spaces,
    ): Source | undefined {
        if (newTokens.length !== this.tokens.length) return undefined;

        // Walk pairwise looking for at most one text-only difference.
        // Reject any difference in Sym types — those would change the parse.
        let differingIndex = -1;
        for (let i = 0; i < newTokens.length; i++) {
            const newT = newTokens[i];
            const oldT = this.tokens[i];
            // Sym type lists must match exactly.
            if (newT.types.length !== oldT.types.length) return undefined;
            for (let j = 0; j < newT.types.length; j++)
                if (newT.types[j] !== oldT.types[j]) return undefined;
            if (newT.getText() === oldT.getText()) continue;
            if (differingIndex !== -1) return undefined;
            differingIndex = i;
        }

        // Re-key the new spaces map so unchanged token slots use the OLD
        // token instances. The differing slot keeps its new instance.
        for (let i = 0; i < newTokens.length; i++)
            if (i !== differingIndex)
                newSpaces.replace(newTokens[i], this.tokens[i]);

        // Whitespace-only change: keep the existing AST, swap in the new spaces.
        if (differingIndex === -1)
            return new Source(
                this.names,
                [this.expression, newSpaces],
                this.keywords,
            );

        // Single-token text change: clone the path from root to the affected
        // token, replacing the old token with the new one. Everything else in
        // the tree is reused by reference.
        const newProgram = this.expression.replace(
            this.tokens[differingIndex],
            newTokens[differingIndex],
        );
        return new Source(this.names, [newProgram, newSpaces], this.keywords);
    }

    withCode(code: string) {
        return new Source(this.names, new UnicodeString(code), this.keywords);
    }

    withProgram(program: Program, spaces: Spaces) {
        return new Source(this.names, [program, spaces], this.keywords);
    }

    clone(replace?: Replacement) {
        // If replacing, we need to clone the spaces as well.
        if (
            replace &&
            replace.original instanceof Node &&
            (replace.replacement instanceof Node ||
                replace.replacement === undefined)
        ) {
            const newSource = new Source(
                this.names,
                [
                    this.replaceChild('expression', this.expression, replace),
                    this.spaces.withReplacement(
                        replace.original,
                        replace.replacement,
                    ),
                ],
                this.keywords,
            );

            // Pretty print the replaced node, if there is one.
            return (
                replace.replacement
                    ? newSource.withSpaces(
                          getPreferredSpaces(
                              replace.replacement,
                              newSource.spaces,
                          ),
                      )
                    : newSource
            ) as this;
        } else
            return new Source(
                this.names,
                [this.expression, this.spaces],
                this.keywords,
            ) as this;
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

    /** Get the last position of the end of the given line */
    getEndOfLine(line: number): number | undefined {
        let currentLine = 0;
        for (let index = 0; index < this.code.getLength(); index++) {
            const char = this.code.at(index);
            if (char === '\n') {
                if (currentLine === line) return index;
                currentLine++;
            }
        }
        // If we reached the end of the code, and we're on the target line, return the end of the code.
        if (currentLine === line) return this.code.getLength();
        return undefined;
    }

    /** Given a node in this source, return the line the node is on */
    getLine(position: number | Node): number | undefined {
        if (position instanceof Node) {
            const leaf = position.getFirstLeaf();
            if (leaf === undefined) return undefined;

            // Iterate through all of the tokens in order
            let count = 0;
            for (const token of this.leaves()) {
                count += this.spaces.getSpace(token).split('\n').length - 1;
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

    /** Given a node and field name, return the position of the field in the source. */
    getFieldPosition(parent: Node, field: string): number | undefined {
        // Get position of the parent by iterating through its children and finding the first
        // field set. Then, iterate through the fields to find the field before the target field,
        // we so we can find the last position of the last token in the field before. That is the position.
        const grammar = parent.getGrammar();
        const targetField = grammar.find((f) => f.name === field);
        if (targetField === undefined) return undefined; // Field not found in grammar
        const targetFieldIndex = grammar.indexOf(targetField);
        if (targetFieldIndex === -1) return undefined; // Field not found in grammar
        // If the target field is first, return the position of the first token in the parent.
        if (targetFieldIndex === 0) {
            const firstToken = parent.leaves()[0];
            return firstToken
                ? this.getTokenTextPosition(firstToken)
                : this.getNodeFirstPosition(parent);
        } else {
            for (let i = targetFieldIndex + 1; i < grammar.length; i++) {
                const siblingOrList = parent.getField(grammar[i].name);
                const sibling = Array.isArray(siblingOrList)
                    ? siblingOrList[0]
                    : siblingOrList;
                if (sibling) {
                    const firstSiblingToken = sibling.leaves()[0];
                    return firstSiblingToken
                        ? this.getTokenTextPosition(firstSiblingToken)
                        : undefined;
                }
            }
        }
        return undefined;
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
        const tokens = this.leaves();

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

            // Get the physical space prior to the token.
            const actualSpace = this.spaces.getSpace(token);

            // Get the space before each line break.
            const lineSpaces = actualSpace.split('\n');
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
                actualSpace,
                token.getText(),
                tokenLength,
                // Last on line if the last token
                index + 1 === tokens.length ||
                    // Or the next token has a line break before it.
                    this.spaces.getSpace(tokens[index + 1]).includes('\n'),
            );
            if (result !== undefined) return result;

            // Increment the lines and columns based on the rendered position.
            line += lineCount;
            column =
                lineCount > 0
                    ? // Set the column to the length of the last line of space plus the token's length.
                      lastLineSpace.length + tokenLength
                    : // Increment the column by the rendered length of space and text.
                      column + actualSpace.length + tokenLength;

            // Increment the physical position based on actual space and token.
            physical += actualSpace.length + tokenLength;
        }

        // Nothing matched? Return undefined.
        return undefined;
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
        let found = false;
        // Copy before reversing: nodes() now returns a cached array, and
        // reverse() mutates in place, which would corrupt the cache.
        for (const next of [...this.nodes()].reverse()) {
            if (found && next instanceof Token) return next;
            if (next === node) found = true;
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
            ? 0
            : this.getTokenLastPosition(tokenBefore);
    }

    getNodeLastPosition(node: Node) {
        const lastToken = this.getLastToken(node);
        if (lastToken && this.tokenPositions.has(lastToken))
            return this.getTokenLastPosition(lastToken);
        const tokenAfter = this.getTokenAfterNode(node);
        return tokenAfter === undefined
            ? this.code.getLength()
            : this.getTokenTextPosition(tokenAfter);
    }

    getRange(node: Node): [number, number] | undefined {
        const tokens = node.nodes((t): t is Token => t instanceof Token);
        const first = tokens[0];
        const last = tokens[tokens.length - 1];
        const firstIndex = this.getTokenTextPosition(first);
        const lastIndex = this.getTokenLastPosition(last);
        return firstIndex === undefined || lastIndex === undefined
            ? undefined
            : [firstIndex, lastIndex];
    }

    getFirstToken(node: Node): Token | undefined {
        return node.nodes().filter((n): n is Token => n instanceof Token)[0];
    }

    getLastToken(node: Node): Token | undefined {
        return node
            .nodes()
            .filter((n): n is Token => n instanceof Token)
            .at(-1);
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
        return this.withSpaces(getPreferredSpaces(this));
    }

    toWordplay(spaces?: Spaces) {
        return super.toWordplay(spaces ?? this.spaces);
    }

    getPreferredName(locales: LocaleText | LocaleText[]) {
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

    computeConflicts() {
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

    static readonly LocalePath = (l: LocaleText) => l.node.Source;
    getLocalePath() {
        return Source.LocalePath;
    }

    getStartExplanations() {
        return new Markup([]);
    }

    getFinishExplanations() {
        return new Markup([]);
    }

    getCharacter() {
        return Characters.Source;
    }

    getPurpose() {
        return Purpose.Advanced;
    }
}
