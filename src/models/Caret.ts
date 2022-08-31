import Node from "../nodes/Node";
import Token from "../nodes/Token";
import type Project from "./Project";

export default class Caret {

    readonly time: number;
    readonly project: Project;
    readonly position: number | Node;

    constructor(project: Project, position: number | Node) {
        this.time = Date.now();
        this.project = project;
        this.position = position;
    }

    isIndex() { return typeof this.position === "number"; }
    isWhitespace(c: string) { return /[\s\t\n]/.test(c); }

    row() { return typeof this.position === "number" ? this.project.code.substring(0, this.position).split("\n").length - 1 : undefined; }
    column() { 
        if(this.position instanceof Node) return undefined;
        const row = this.row();
        if(row === undefined) return undefined;
        const lines = this.project.code.split("\n");
        const rowPosition = this.rowPosition(row);
        return rowPosition === undefined ? undefined : this.position - rowPosition;
    }
    // Get the code position corresponding to the beginning of the given row.
    rowPosition(row: number): number | undefined {

        const lines = this.project.code.split("\n");
        if(row < 0 || row >= lines.length) return undefined;
        let rowPosition = 0;
        for(let i = 0; i < row; i++)
            rowPosition += lines[i].length + 1;
        return rowPosition;

    }

    between(start: number, end: number): boolean { 
        return typeof this.position === "number" && this.position >= start && (this.position < end || (this.position === end && this.isWhitespace(this.project.code.charAt(this.position)))); 
    }

    left(): Caret { return this.moveHorizontal(-1); }
    right(): Caret { return this.moveHorizontal(1); }
    up(): Caret { return this.moveVertical(-1); }
    down(): Caret { return this.moveVertical(1); }

    moveHorizontal(direction: -1 | 1): Caret {
        if(this.position instanceof Node) {

            // Get the first or last token of the given node.
            const tokens = this.position.nodes().filter(n => n instanceof Token) as Token[];
            return tokens.length === 0 ? this : this.withPosition(direction < 0 ? tokens[0].index : tokens[tokens.length - 1].index + tokens[tokens.length - 1].text.length )
        }
        else {
            const stop = direction < 0 ? 0 : this.project.code.length;
            if(this.position === stop) return this;
            // Otherwise, find the first non-whitespace character in the next position.
            let lastIsntWhitespace = !this.isWhitespace(this.project.code.charAt(this.position));
            let pos = this.position + direction;
            while(pos !== stop) {
                if(!this.isWhitespace(this.project.code.charAt(pos)) || lastIsntWhitespace) break;
                pos += direction;
            }
            return this.withPosition(pos);
        }
    }

    moveVertical(direction: -1 | 1): Caret {

        if(this.position instanceof Node) return this;

        // Get the row and column of the current position.
        let row = this.row();
        const column = this.column();
        if(row === undefined || column === undefined) return this;

        // Get the row before/after the current row.
        const lines = this.project.code.split("\n");
        
        row += direction;
        while((direction < 0 ? row >= 0 : row < lines.length)) {
            // If the next row isn't just whitespace, then return the position corresponding to the closest column on the next line
            const rowPosition = this.rowPosition(row);
            if(rowPosition !== undefined && lines[row].trim().length > 0) {
                return this.withPosition(rowPosition + Math.min(column, lines[row].length));
            }
            // Otherwise, go to the next row.
            row += direction;
        }

        // If we ran out of rows, return the first/last position.
        return this.withPosition(direction < 0 ? 0 : this.project.code.length);

    }

    withPosition(position: number | Node): Caret { return new Caret(this.project, position); }

}