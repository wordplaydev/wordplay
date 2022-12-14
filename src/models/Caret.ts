import type { Edit } from "../editor/util/Commands";
import Node from "../nodes/Node";
import Token from "../nodes/Token";
import { DELIMITERS, PLACEHOLDER_SYMBOL, PROPERTY_SYMBOL } from "../parser/Tokenizer";
import type Source from "./Source";

export type InsertionContext = { before: Node[], after: Node[] };

// Represents a node, list on the node, and index in the list at which to insert a node.
export type InsertionPoint = {
    node: Node,
    field: string,
    list: Node[],
    token: Token,
    line: number,
    index: number
}

export function insertionPointsEqual(insertion1: InsertionPoint, insertion2: InsertionPoint) {
    return insertion1.node === insertion2.node && 
            insertion1.list === insertion2.list && 
            insertion1.token === insertion2.token &&
            insertion1.line === insertion2.line && 
            insertion1.index === insertion2.index;
}

export default class Caret {

    readonly time: number;
    readonly source: Source;
    readonly position: number | Node;

    // A cache of the token we're at, since we use it frequently.
    readonly token: Token | undefined;
    readonly tokenPrior: Token | undefined;
    readonly tokenSpaceIndex: number | undefined;
    readonly tokenExcludingWhitespace: Token | undefined;

    constructor(source: Source, position: number | Node) {
        this.time = Date.now();
        this.source = source;
        this.position = position;

        this.token = (typeof this.position === "number") ? this.source.getTokenAt(this.position) : undefined;
        this.tokenPrior = (typeof this.position === "number") ? this.source.getTokenAt(this.position - 1) : undefined;
        this.tokenSpaceIndex = this.token === undefined ? undefined : this.source.getTokenSpacePosition(this.token);
        this.tokenExcludingWhitespace = (typeof this.position === "number") ? this.source.getTokenAt(this.position, false) : undefined;

    }

    atBeginningOfToken() {
        return this.tokenSpaceIndex === this.position
    }

    getCode() { return this.source.getCode(); }
    getProgram() { return this.source.expression; }
    getToken(): Token | undefined { return this.token; }
    getTokenExcludingWhitespace(): Token | undefined { return this.tokenExcludingWhitespace; }
    tokenAtHasPrecedingSpace(): boolean { return this.token !== undefined && this.source.spaces.getSpace(this.token).length > 0; }

    getNodesBetween() {

        // If the caret is a node, there is no notion of between.
        if(this.position instanceof Node) return undefined;

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
        const tokens = this.getProgram().nodes().filter(token => token instanceof Token) as Token[];
        const tokenAfter = this.source.getTokenWithSpaceAt(this.position);
        if(tokenAfter === undefined) return undefined;
        // Find the token before the caret
        const tokenBefore = tokens[0] === tokenAfter ? undefined : tokens[tokens.indexOf(tokenAfter) - 1];

        // Make a list of parent/child nodes that are adjacent to the caret.
        const pairs: InsertionContext = {
            before: [],
            after: []
        };

        // Start with the token after and find all nodes that contain this token's space.
        let node: Node | undefined | null = tokenAfter;
        while(node instanceof Node) {
            const firstToken = this.source.getFirstToken(node);
            if(firstToken === undefined || !this.source.tokenSpaceContains(firstToken, this.position))
                break;
            const parent: Node | undefined = this.source.get(node)?.getParent();
            if(parent)
                pairs.before.push(node);
            node = parent;
        }

        // Start with the token before and find all of the ancestors for which the token before is the last token in the node.
        if(tokenBefore !== undefined) {
            let node: Node | undefined | null = tokenBefore;
            while(node instanceof Node) {
                const parent: Node | undefined = this.source.get(node)?.getParent();
                const nodesTokens = node.nodes(t => t instanceof Token);
                if(parent && nodesTokens.length > 0 && nodesTokens[nodesTokens.length - 1] === tokenBefore)
                    pairs.after.push(node);
                node = parent;
            }
        }

        return pairs;

    }

    isEnd() { return this.isIndex() && this.position === this.source.getCode().getLength() }
    isIndex() { return typeof this.position === "number"; }
    getIndex() { return this.isIndex() ? this.position as number : undefined; }

    isSpace(c: string) { return /[\t\n ]/.test(c); }
    isTab(c: string) { return /[\t]/.test(c); }
    isNode() { return this.position instanceof Node; }
    isAtPropertyReference() {

        if(this.position instanceof Node) return false;
        return this.source.getCode().at(this.position - 1) === PROPERTY_SYMBOL;

    }

    /** True if this caret's position is or is inside of the given node. */
    isIn(node: Node) {
        
        if(this.position instanceof Node)
            return this.position === node || node.contains(this.position);
        
        if(!this.source.expression.contains(node)) return false;

        const start = this.source.getNodeFirstPosition(node);
        const end = this.source.getNodeLastPosition(node);
        return start !== undefined && end !== undefined && start <= this.position && this.position <= end;

    }

    // Get the code position corresponding to the beginning of the given row.
    rowPosition(row: number): number | undefined {

        const lines = this.source.getCode().getLines();
        if(row < 0 || row >= lines.length) return undefined;
        let rowPosition = 0;
        for(let i = 0; i < row; i++)
            rowPosition += lines[i].getLength() + 1;
        return rowPosition;

    }

    /* Compute the column of text the caret is at, if a number. */
    column() {
        if(typeof this.position === "number") {
            let column = 0;
            let index = this.position;
            while(index > 0 && this.source.getCode().at(index) !== "\n") { 
                index = index - 1; 
                column = column + 1; 
            }
            return Math.max(column - 1, 0);
        }
        return undefined;
    }

    left(): Caret { return this.moveHorizontal(-1); }
    right(): Caret { return this.moveHorizontal(1); }

    nextNewline(direction: -1 | 1): Caret | undefined {
        if(typeof this.position !== "number") return undefined;
        let pos = this.position;
        while(pos >= 0 && pos < this.source.getCode().getLength()) {
            pos += direction;
            if(this.source.getCode().at(pos) === "\n")
                break;
        }
        return this.withPosition(Math.min(Math.max(0, pos), this.source.getCode().getLength()));
    }

    moveHorizontal(direction: -1 | 1): Caret {
        if(this.position instanceof Node) {
            // Get the first or last token of the given node.
            const tokens = this.position.nodes(n => n instanceof Token) as Token[];
            const last = tokens[tokens.length - 1];
            const index = direction < 0 ? this.source.getTokenTextPosition(tokens[0]) : this.source.getTokenTextPosition(last) === undefined ? undefined : this.source.getTokenTextPosition(last) + tokens[tokens.length - 1].getTextLength();
            if(index !== undefined)
                return tokens.length === 0 ? this : this.withPosition(index);
            else
                return this;
        }
        else {
            if(this.position === (direction < 0 ? 0 : this.source.getCode().getLength())) return this;
            let pos = this.position + direction;

            // If we're at a placeholder, return the token at this position
            if(this.source.code.at(this.position - (direction < 0 ? 1 : 0)) === PLACEHOLDER_SYMBOL) {
                const placeholderToken = this.source.getTokenAt(this.position - (direction < 0 ? 1 : 0));
                if(placeholderToken)
                    return this.withPosition(placeholderToken);
            }

            return this.withPosition(pos);
        }
    }

    moveNodeHorizontal(direction: -1 | 1) {
        if(this.position instanceof Node) {
            const nodes = this.source.nodes(node => node instanceof Token);
            let index = nodes.indexOf(this.position);
            let next = nodes[index + direction];
            // while(next !== undefined && next instanceof Token) {
            //     index += direction;
            //     next = nodes[index + direction];
            // }
            return next === undefined ? this : this.withPosition(next);
        }
        else return this;
    }

    withPosition(position: number | Node): Caret { 
        if(typeof position === "number" && isNaN(position)) throw Error("NaN on caret set!");
        return new Caret(this.source, typeof position === "number" ? Math.max(0, Math.min(position, this.source.getCode().getLength())) : position); 
    }

    withSource(source: Source) { return new Caret(source, this.position); }

    insert(text: string): Edit | undefined {
        if(typeof this.position === "number") {

            // If the string matches a single matched delimiter, complete it.
            const closed = text in DELIMITERS;
            if(closed)
                text += DELIMITERS[text];

            const newSource = this.source.withGraphemesAt(text, this.position);
            return newSource === undefined ? undefined : [ newSource, new Caret(newSource, this.position + (closed ? 1 : text.length)) ];
        }
        else if(this.position instanceof Token && this.position.getText() === PLACEHOLDER_SYMBOL) {
            const indexOfPlaceholder = this.source.getTokenTextPosition(this.position);
            let newSource = this.source.withoutGraphemeAt(indexOfPlaceholder);
            newSource = newSource?.withGraphemesAt(text, indexOfPlaceholder);
            return newSource === undefined ? undefined : [ newSource, new Caret(newSource, indexOfPlaceholder + text.length)]


        }
    }

    getRange(node: Node): [ number, number ] | undefined {
        const tokens = node.nodes(t => t instanceof Token) as Token[];
        const first = tokens[0];
        const last = tokens[tokens.length - 1];
        const firstIndex = this.source.getTokenTextPosition(first);
        const lastIndex = this.source.getTokenLastPosition(last);
        return firstIndex === undefined || lastIndex === undefined ? undefined : [ firstIndex, lastIndex ];
    }

    replace(old: Node, replacement: string): Edit | undefined  {

        const range = this.getRange(old);
        if(range === undefined) return;
        const newCode = replacement;

        const newSource = 
            this.source
                .withoutGraphemesBetween(range[0], range[1])
                ?.withGraphemesAt(newCode, range[0]);

        if(newSource === undefined) return;

        return [ newSource, new Caret(newSource, range[0] + newCode.length)];        

    }
    
    backspace(): Edit | undefined  {
        if(typeof this.position === "number") {
            const before = this.source.getCode().at(this.position - 1);
            const after = this.source.getCode().at(this.position);
            if(before && after && DELIMITERS[before] === after) {
                // If there's an adjacent pair of delimiters, delete them both.
                let newSource = this.source.withoutGraphemeAt(this.position);
                if(newSource)
                    newSource = newSource.withoutGraphemeAt(this.position - 1);
                return newSource === undefined ? undefined : [ newSource , new Caret(newSource, Math.max(0, this.position - 1)) ];    
            } else {
                const newSource = this.source.withoutGraphemeAt(this.position - 1);
                return newSource === undefined ? undefined : [ newSource , new Caret(newSource, Math.max(0, this.position - 1)) ];    
            }
            
        } 
        // If it's a node, see if there's a removal transform.
        else {

            // const removal = this.source.get(this.position)?.getParent()?.getChildRemoval(this.position, this.source.getContext());
            // if(removal) return removal.getEdit(["eng"]);
            // else {
                // Delete the text between the first and last token.
                const range = this.getRange(this.position);
                if(range === undefined) return; 
                const newSource = this.source.withoutGraphemesBetween(range[0], range[1]);
                return newSource === undefined ? undefined : [ newSource , new Caret(newSource, range[0]) ];
            // }
        }
    }
    
    moveVertical(editor: HTMLElement, direction: 1 | -1): Edit | undefined  {

        if(this.position instanceof Node) {
            const position = this.source.getNodeFirstPosition(this.position);
            if(position === undefined) return;
            const newCaret = this.getVertical(editor, direction, position, false);
            if(newCaret === undefined || newCaret.position instanceof Node) return newCaret;
            const token = this.source.getTokenAt(newCaret.position, true);
            if(token === undefined) return this;
            return this.withPosition(token);
        } 
        else return this.getVertical(editor, direction, this.position);
        
    }

    getVertical(editor: HTMLElement, direction: 1 | -1, position: number, includeSpace=true) {

        // Find the start of the previous line.
        if(direction < 0) {
            // Keep moving previous while the symbol before isn't a newline.
            while(this.getCode().at(position - 1) !== undefined && this.getCode().at(position - 1) !== "\n") position--;
            // Move the before the newline to the line above.
            position--;
            // Move to the beginning of this line.
            while(this.getCode().at(position - 1) !== undefined && this.getCode().at(position - 1) !== "\n") position--;
        }
        else {
            // If we're at a newline, just move forward past it to the beginning of the next line.
            if(this.getCode().at(position) === "\n") position++;
            // Otherwise, move forward until we find a newline, then move past it.
            else {
                while(this.getCode().at(position) !== undefined && this.getCode().at(position) !== "\n") position++;
                position++;
            }
        }

        // If we're not including space, and the current position is space, keep moving past it.
        if(!includeSpace) {
            while(this.source.isEmptyLine(position))
                position += direction;
            position += direction;
        }

        // If we hit the beginning, set the position to the beginning.
        if(position < 0) return this.withPosition(0);
        // If we hit the end, set the position to the end.
        if(position >= this.getCode().getLength()) return this.withPosition(this.getCode().getLength());
        
        // Get the starting token on this line.
        let currentToken = this.source.getTokenAt(position);
        if(currentToken === undefined) return;
    
        const index = this.source.getTokenTextPosition(currentToken);
        // If the position is on a different line from the current token, just move to the line.
        if(index !== undefined && position < index - this.source.spaces.getLastLineSpaces(currentToken)) {
            return this.withPosition(position);
        }
        // Find the tokens on the row in the direction we're moving.
        else {
    
            // Find the caret and it's position.
            const caretView = editor.querySelector(".caret") ?? editor.querySelector(".selected");
            if(!(caretView instanceof HTMLElement)) return;
            const caretRect = caretView.getBoundingClientRect();
            const caretX = caretRect.left;
    
            // Find the views on this line and their horizontal distance from the caret.
            const candidates: { token: Token, rect: DOMRect, distance: number }[] = [];
            while(currentToken !== undefined) {
                const view = editor.querySelector(`.token-view[data-id="${currentToken.id}"]`);
                if(view) {
                    const rect = view.getBoundingClientRect();
                    candidates.push({
                        token: currentToken,
                        rect: rect,
                        distance: Math.min(Math.abs(caretX - rect.left), Math.abs(caretX - rect.right))
                    });
                }
                currentToken = this.source.getNextToken(currentToken, 1);
                // If we reached a token with newlines, then we're done adding tokens for consideration.
                if(currentToken && this.source.spaces.hasLineBreak(currentToken)) break;
            }
    
            // Sort the candidates by distance, then find the offset within the token closest to the caret.
            const sorted = candidates.sort((a, b) => a.distance - b.distance);
            if(sorted.length > 0) {
                const choice = sorted[0];
                const length = choice.token.getTextLength();
                const startPosition = this.source.getTokenTextPosition(choice.token);
                if(startPosition !== undefined && length !== undefined) {
                    // Choose the offset based on whether the caret is to the left, right, or in between the horizontal axis of the chosen token.
                    const offset = 
                        caretRect.left > choice.rect.right ? length :
                        caretRect.left < choice.rect.left ? 0 :
                        (choice.rect.width === 0 ? 0 : Math.round(length * ((caretRect.left - choice.rect.left) / choice.rect.width)));
                    return this.withPosition(startPosition + offset);
                }
            }
        }
    
    }

}