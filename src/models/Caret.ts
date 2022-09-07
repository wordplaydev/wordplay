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
    getIndex() { return this.isIndex() ? this.position as number : undefined; }

    isWhitespace(c: string) { return /[\t\n ]/.test(c); }
    isTab(c: string) { return /[\t]/.test(c); }

    // Get the code position corresponding to the beginning of the given row.
    rowPosition(row: number): number | undefined {

        const lines = this.project.code.getLines();
        if(row < 0 || row >= lines.length) return undefined;
        let rowPosition = 0;
        for(let i = 0; i < row; i++)
            rowPosition += lines[i].getLength() + 1;
        return rowPosition;

    }

    between(start: number, end: number): boolean { 
        return typeof this.position === "number" && 
            // It must be after the start OR at the start and not whitespace
            (this.position > start || (this.position === start && !this.isWhitespace(this.project.code.at(start) ?? ''))) && 
            // ... and it must be before the end OR at the end and either the very end or at whitespace.
            (this.position < end || (this.position === end && (this.position === this.project.code.getLength() || this.isWhitespace(this.project.code.at(this.position) ?? ''))));
    }

    left(): Caret { return this.moveHorizontal(-1); }
    right(): Caret { return this.moveHorizontal(1); }

    nextNewline(direction: -1 | 1): Caret | undefined {
        if(typeof this.position !== "number") return undefined;
        let pos = this.position;
        while(pos >= 0 && pos < this.project.code.getLength()) {
            pos += direction;
            if(this.project.code.at(pos) === "\n")
                break;
        }
        return this.withPosition(Math.min(Math.max(0, pos), this.project.code.getLength()));
    }

    moveHorizontal(direction: -1 | 1): Caret {
        if(this.position instanceof Node) {
            // Get the first or last token of the given node.
            const tokens = this.position.nodes().filter(n => n instanceof Token) as Token[];
            return tokens.length === 0 ? this : this.withPosition(direction < 0 ? tokens[0].index : tokens[tokens.length - 1].index + tokens[tokens.length - 1].getTextLength() )
        }
        else {
            const stop = direction < 0 ? 0 : this.project.code.getLength();
            if(this.position === stop) return this;
            // This needs to be Unicode aware, as we don't want to navgiate to the next code point, but rather the
            // next grapheme in the string. To find this, we have to find the position of the next grapheme in the program.
            let pos = this.position + direction;
            return this.withPosition(pos);
        }
    }

    withPosition(position: number | Node): Caret { return new Caret(this.project, position); }

}