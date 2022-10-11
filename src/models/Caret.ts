import type { Edit } from "../editor/Commands";
import Node from "../nodes/Node";
import Token from "../nodes/Token";
import type Source from "./Source";

export default class Caret {

    readonly time: number;
    readonly source: Source;
    readonly position: number | Node;

    constructor(source: Source, position: number | Node) {
        this.time = Date.now();
        this.source = source;
        this.position = position;
    }

    getCode() { return this.source.getCode(); }
    getProgram() { return this.source.program; }
    getToken(): Token | undefined {
        return (typeof this.position === "number") ? 
            this.getProgram().nodes().find(token => token instanceof Token && token.containsPosition(this.position as number)) as Token | undefined : 
            undefined;
    }

    on(node: Node): boolean {
        const tokens = node.nodes(n => n instanceof Token) as Token[];
        const first = tokens.length > 0 ? tokens[0] : undefined;
        const last = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
        return this.position === node || (typeof this.position === "number" && first !== undefined && first.index !== undefined && last !== undefined && last.index !== undefined && this.position >= first.index && this.position <= last.index + last.getTextLength());
    }

    isEnd() { return this.isIndex() && this.position === this.source.getCode().getLength() }
    isIndex() { return typeof this.position === "number"; }
    getIndex() { return this.isIndex() ? this.position as number : undefined; }

    isWhitespace(c: string) { return /[\t\n ]/.test(c); }
    isTab(c: string) { return /[\t]/.test(c); }
    isNode() { return this.position instanceof Node; }

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

    between(start: number, end: number): boolean { 
        return typeof this.position === "number" && 
            // It must be after the start OR at the start and not whitespace
            (this.position > start || (this.position === start && (start === 0 || !this.isWhitespace(this.source.getCode().at(start) ?? '')))) && 
            // ... and it must be before the end OR at the end and either the very end or at whitespace.
            (this.position < end || (this.position === end && (this.isWhitespace(this.source.getCode().at(this.position) ?? ''))));
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
            const index = direction < 0 ? tokens[0].index : last.index === undefined ? undefined : last.index + tokens[tokens.length - 1].getTextLength();
            if(index !== undefined)
                return tokens.length === 0 ? this : this.withPosition(index);
            else
                return this;
        }
        else {
            const stop = direction < 0 ? 0 : this.source.getCode().getLength();
            if(this.position === stop) return this;
            // This needs to be Unicode aware, as we don't want to navgiate to the next code point, but rather the
            // next grapheme in the string. To find this, we have to find the position of the next grapheme in the program.
            let pos = this.position + direction;
            return this.withPosition(pos);
        }
    }

    withPosition(position: number | Node): Caret { 
        if(typeof position === "number" && isNaN(position)) throw Error("NaN on caret set!");
        return new Caret(this.source, typeof position === "number" ? Math.max(0, Math.min(position, this.source.getCode().getLength())) : position); 
    }

    withSource(source: Source) { return new Caret(source, this.position); }

    insertChar(char: string): Edit {
        if(typeof this.position === "number") {
            const newSource = this.source.withGraphemesAt(char, this.position);
            return newSource === undefined ? undefined : [ newSource, new Caret(newSource, this.position + char.length) ];
        }
    }

    getRange(node: Node): [ number, number ] | undefined {
        const tokens = node.nodes(t => t instanceof Token) as Token[];
        const first = tokens[0];
        const last = tokens[tokens.length - 1];
        const firstIndex = first.index;
        const lastIndex = last.getLastIndex();
        return firstIndex === undefined || lastIndex === undefined ? undefined : [ firstIndex, lastIndex ];
    }

    replace(old: Node, replacement: Node): Edit {

        const range = this.getRange(old);
        if(range === undefined) return;
        const newCode = replacement.toWordplay();

        const newSource = 
            this.source
                .withoutGraphemesBetween(range[0], range[1])
                ?.withGraphemesAt(newCode, range[0]);

        if(newSource === undefined) return;

        return [ newSource, new Caret(newSource, range[0] + newCode.length)];        

    }
    
    backspace(): Edit {
        if(typeof this.position === "number") {
            const newSource = this.source.withoutGraphemeAt(this.position - 1);
            return newSource === undefined ? undefined : [ newSource , new Caret(newSource, Math.max(0, this.position - 1)) ];
        } 
        // If it's a node, delete the text between the first and last token and replace it with a placeholder.
        else {
            const range = this.getRange(this.position);
            if(range === undefined) return; 
            const newProject = this.source.withoutGraphemesBetween(range[0], range[1]);
            return newProject === undefined ? undefined : [ newProject , new Caret(newProject, range[0]) ];
        }
    }
    
    moveVertical(editor: HTMLElement, direction: 1 | -1): Edit {

        if(this.position instanceof Node) return;
    
        // Find the start of the previous line.
        let position = this.position;
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
    
        // If we hit the beginning, set the position to the beginning.
        if(position < 0) return this.withPosition(0);
        // If we hit the end, set the position to the end.
        if(position >= this.getCode().getLength()) return this.withPosition(this.getCode().getLength());
        
        // Get the starting token on this line.
        let currentToken: Token | undefined = this.getProgram().nodes().find(token => token instanceof Token && token.containsPosition(position as number)) as Token | undefined;
        if(currentToken === undefined) return;
    
        const index = currentToken.getTextIndex();
        // If the position is on a different line from the current token, just move to the line.
        if(index !== undefined && position < index - currentToken.precedingSpaces) {
            return this.withPosition(position);
        }
        // Find the tokens on the row in the direction we're moving.
        else {
    
            // Find the caret and it's position.
            const caretView = editor.querySelector(".caret");
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
                if(currentToken && currentToken.newlines > 0) break;
            }
    
            // Sort the candidates by distance, then find the offset within the token closest to the caret.
            const sorted = candidates.sort((a, b) => a.distance - b.distance);
            if(sorted.length > 0) {
                const choice = sorted[0];
                const length = choice.token.getTextLength();
                const startPosition = choice.token.getTextIndex();
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