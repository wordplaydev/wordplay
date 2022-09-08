import Caret from "../models/Caret";
import type Program from "../nodes/Program";
import Node from "../nodes/Node";
import Token, { TAB_WIDTH } from "../nodes/Token";
import type Project from "../models/Project";

export type Command = {
    description: string,
    key?: string,
    alt?: boolean,
    control?: boolean,
    execute: (caret: Caret, editor: HTMLElement, key: string) => Caret | [ Project, Caret] | undefined
}

export function getTokenByView(program: Program, tokenView: Element) {
    if(tokenView instanceof HTMLElement && tokenView.dataset.id !== undefined) {
        const node = program.getNodeByID(parseInt(tokenView.dataset.id));
        return node instanceof Token ? node : undefined;
    }
    return undefined;
}

function caretVertical(editor: HTMLElement, $caret: Caret, direction: 1 | -1): Caret | undefined {

    // Get the current caret position.
    const position = $caret?.position;
    if($caret === undefined || position === undefined || typeof position !== "number") return;

    // Find all the tokens.
    const tokenViews = editor.querySelectorAll(".token-view");

    // Find the caret
    const caretView = editor.querySelector(".caret");
    if(!(caretView instanceof HTMLElement)) return;

    // Split them into rows.
    const rows: { newline: number, tokens: Element[]}[] = [{ newline: -1, tokens: [] }];
    tokenViews.forEach(view => {
        const token = getTokenByView($caret.getProgram(), view);
        if(token) {

            // All lines except for the last are whitespace lines for the purposes of caret navigation.
            for(let i = 0; i < token.newlines; i++) rows.push({ newline: i, tokens: [ view ]});
            const row = rows[rows.length - 1];
            // Change the last row to non-whitespace, since it 
            row.newline = -1;
            row.tokens.push(view);
        }
    });

    // Find the caret's current row.
    let rowIndex = 0;
    for(; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const candidate = row.tokens.find(view => {
            const token = getTokenByView($caret.getProgram(), view);
            if(token instanceof Token)
                // This token matches if it is whitespace and contains the caret, or if it's not whitespace and it's text contains the caret.
                if(row.newline >= 0) {
                    if(position < token.getWhitespaceIndex() || position >= token.getTextIndex()) return false;
                    // Which line is the caret on?
                    let offset = position - token.getWhitespaceIndex();
                    let whitespacePrior = token.whitespace.substring(0, offset);
                    let newline = whitespacePrior.split("\n").length - 2;
                    return newline === row.newline;
                }
                // If the token is more than whitespace, just check the start and end
                else
                    return position >= token.getWhitespaceIndex() && position <= token.getLastIndex();
            else
                return false;
        });
        if(candidate !== undefined)
            break;
    }

    // Bail if we didn't find it. (This means something is horribly wrong with rendering or the code above).
    if(rowIndex === rows.length) {
        console.error("Hm, couldn't find the view of the caret position");
        return;
    }

    // If there's no row in the direction we're moving, just go to the end of this row.
    if(rowIndex === (direction < 0 ? 0 : rows.length - 1)) {
        if(rows[rowIndex].tokens.length > 0) {
            const row = rows[rowIndex];
            const token = getTokenByView($caret.getProgram(), row.tokens[direction < 0 ? 0 : row.tokens.length - 1]);
            const index = token === undefined ? undefined : token.getTextIndex();
            if(index !== undefined) return $caret.withPosition(index);
        }
    }
    // Otherwise, find the closest token horizontally in the row in the direction we're moving.
    else {
        rowIndex += direction;

        // If the row we're moving to is a whitespace row...
        if(rows[rowIndex].newline >= 0) {

            // If the next character is a newline too, just move to it.
            if($caret.project.code.at(position + direction) === "\n") {
                return $caret.withPosition(position + direction);
                return;
            }

            // Find the column the caret is on.
            let column = $caret.column();
            if(column !== undefined) {

                // ... move to the next row.
                let pos = position;

                // Move past all of the non-newlines.
                while(pos > 0 && pos < $caret.project.code.getLength() && $caret.project.code.at(pos) !== "\n")
                    pos += direction;
                // Move past the newline.
                pos += direction;

                // If we're moving up and not already on a newline, move to the beginning of this whitespace row
                // so we can count coluns from the left edge instead of compute the column width of this line and count from the right.
                if(direction < 0) {
                    while(pos > 0 && pos < $caret.project.code.getLength() && $caret.project.code.at(pos) !== "\n")
                        pos += direction;
                    pos -= direction;
                }

                // Find the closest column on this line.
                let currentColumn = 0;
                while(pos > 0 && pos < $caret.project.code.getLength() && $caret.project.code.at(pos) !== "\n") {
                    const char = $caret.project.code.at(pos);
                    const previousColumn = currentColumn;
                    currentColumn += char === " " ? 1 : char === "\t" ? TAB_WIDTH : 0;
                    if(previousColumn <= column && currentColumn >= column) break;
                    pos += 1;
                }

                // Set the caret
                return $caret.withPosition(pos);
            }
        } 
        // Otherwise, find the nearest token on the next row.
        else {

            const caretRect = caretView.getBoundingClientRect();
            const distances = rows[rowIndex].tokens.map(candidate => {
                const candidateRect = candidate.getBoundingClientRect();
                return {
                    token: candidate,
                    rect: candidateRect,
                    distance: Math.abs(caretRect.left - (candidateRect.left + candidateRect.width / 2))
                };
            });
            const sorted = distances.sort((a, b) => a.distance - b.distance);
            // Now that we've found the closest token horizontally in the next row, choose the closest point in the token's whitespace or text.
            if(sorted.length > 0) {
                const choice = sorted[0];
                const token = getTokenByView($caret.getProgram(), choice.token);
                const length = token?.getTextLength();
                const startPosition = token?.getTextIndex();
                if(startPosition !== undefined && length !== undefined) {
                    // Choose the offset based on whether the caret is to the left, right, or in between the horizontal axis of the chosen token.
                    const offset = 
                        caretRect.left > choice.rect.right ? length :
                        caretRect.left < choice.rect.left ? 0 :
                        (choice.rect.width === 0 ? 0 : Math.round(length * ((caretRect.left - choice.rect.left) / choice.rect.width)));
                    return $caret.withPosition(startPosition + offset);
                }
            }
        }
    }

}

function insertChar(caret: Caret, char: string): [ Project, Caret] | undefined {
    if(typeof caret.position === "number") {
        const newProject = caret.project.withCharacterAt(char, caret.position);
        return newProject === undefined ? undefined : [ newProject, new Caret(newProject, caret.position + 1) ];
    }
}

function backspace(caret: Caret): [ Project, Caret] | undefined  {
    if(typeof caret.position === "number") {
        const newProject = caret.project.withoutGraphemeAt(caret.position - 1);
        return newProject === undefined ? undefined : [ newProject , new Caret(newProject, Math.max(0, caret.position - 1)) ];
    } 
    // If it's a node, delete the text between the first and last token.
    else {
        const tokens = caret.position.nodes(n => n instanceof Token) as Token[];
        if(tokens.length > 0) {
            const start = tokens[0].getTextIndex();
            const end = tokens[tokens.length - 1].getLastIndex();
            const newProject = caret.project.withoutGraphemesBetween(start, end);
            return newProject === undefined ? undefined : [ newProject , new Caret(newProject, start) ];
        }
    }
}

const commands: Command[] = [
    {
        description: "Move caret up a line to the closest horizontal position visually",
        alt: false,
        key: "ArrowUp",
        execute: (caret: Caret, editor: HTMLElement) => caretVertical(editor, caret, -1)
    },
    {
        description: "Move caret down a line to the closest horizontal position visually",
        alt: false,
        key: "ArrowDown",
        execute: (caret: Caret, editor: HTMLElement) => caretVertical(editor, caret, 1)
    },
    {
        description: "Select the entire program",
        control: true,
        key: "KeyA",
        execute: (caret: Caret) => caret.withPosition(caret.getProgram())
    },
    {
        description: "Move the caret one position left",
        key: "ArrowLeft",
        execute: (caret: Caret) => caret.left()
    },
    {
        description: "Move the caret one position right",
        key: "ArrowRight",
        execute: (caret: Caret) => caret.right()
    },
    {
        description: "Select the parent of the current caret position",
        key: "Escape",
        execute: (caret: Caret) => {        
            const position = caret.position;
            if(position instanceof Node) {
                // What tokens are selected currently?
                const selectedTokens = position.nodes(n => n instanceof Token) as Token[];
                // Select the parent node
                let parent: Node | undefined | null = position.getParent();
                let parentTokens = parent?.nodes(n => n instanceof Token) as Token[];
                // While the parent's nodes are equivalent to the 
                while(parent && parentTokens.length === selectedTokens.length && parentTokens.every((t, i) => t === selectedTokens[i])) {
                    const newParent = parent.getParent();
                    if(newParent) {
                        parent = newParent;
                        parentTokens = parent.nodes(n => n instanceof Token) as Token[];
                    }
                    else break;
                }
                // If we still have a parent, 
                if(parent)
                    return caret.withPosition(parent);
            }
            // Find the node corresponding to the position.
            else {
                const token = caret.getToken();
                if(token !== undefined)
                    return caret.withPosition(token);
            }
        }        
    },
    {
        description: "Insert reaction symbol (∆)",
        alt: true, key: "KeyD",
        execute: (caret: Caret) => insertChar(caret, "∆")
    },
    {
        description: "Insert borrow symbol (↓)",
        alt: true, key: "ArrowDown",
        execute: (caret: Caret) => insertChar(caret, "↓")
    },
    {
        description: "Insert convert symbol (→)",
        alt: true, key: "ArrowRight",
        execute: (caret: Caret) => insertChar(caret, "→")
    },
    {
        description: "Insert share symbol (↑)",
        alt: true, key: "ArrowUp",
        execute: (caret: Caret) => insertChar(caret, "↑")
    },
    {
        description: "Insert infinity symbol (∞)",
        alt: true, key: "Digit5",
        execute: (caret: Caret) => insertChar(caret, "∞")
    },
    {
        description: "Insert pi symbol (π)",
        alt: true, key: "KeyP",
        execute: (caret: Caret) => insertChar(caret, "π")
    },
    {
        description: "Insert Boolean AND symbol (∧)",
        alt: true, key: "Digit6",
        execute: (caret: Caret) => insertChar(caret, "∧")
    },
    {
        description: "Insert Boolean OR symbol (∨)",
        alt: true, key: "Digit7",
        execute: (caret: Caret) => insertChar(caret, "∨")
    },
    {
        description: "Insert type symbol (•)",
        alt: true, key: "Digit8",
        execute: (caret: Caret) => insertChar(caret, "•")
    },
    {
        description: "Insert true symbol (⊤)",
        alt: true, key: "Digit9",
        execute: (caret: Caret) => insertChar(caret, "⊤")
    },
    {
        description: "Insert false symbol (⊥)",
        alt: true, key: "Digit9",
        execute: (caret: Caret) => insertChar(caret, "⊥")
    },
    {
        description: "Insert not equal symbol (≠)",
        alt: true, key: "Equal",
        execute: (caret: Caret) => insertChar(caret, "≠")
    },
    {
        description: "Insert function symbol (ƒ)",
        alt: true, key: "KeyF",
        execute: (caret: Caret) => insertChar(caret, "ƒ")
    },
    {
        description: "Insert Boolean NOT symbol (¬)",
        alt: true, key: "Backquote",
        execute: (caret: Caret) => insertChar(caret, "¬")
    },
    {
        description: "Insert less than or equal to symbol (≤)",
        alt: true, key: "Comma",
        execute: (caret: Caret) => insertChar(caret, "≤")
    },
    {
        description: "Insert greater than or equal to symbol (≥)",
        alt: true, key: "Period",
        execute: (caret: Caret) => insertChar(caret, "≥")
    },
    {
        description: "Insert placeholder symbol (…)",
        alt: true, key: "Semicolon",
        execute: (caret: Caret) => insertChar(caret, "…")
    },
    {
        description: "Insert divide symbol (÷)",
        alt: true, key: "Slash",
        execute: (caret: Caret) => insertChar(caret, "÷")
    },
    {
        description: "Insert new line",
        key: "Enter",
        execute: (caret: Caret) => insertChar(caret, "\n")
    },
    {
        description: "Insert tab",
        key: "Tab",
        execute: (caret: Caret) => insertChar(caret, "\t")
    },
    {
        description: "Delete previous character",
        key: "Backspace",
        execute: (caret: Caret) => backspace(caret)
    }
];

export default commands;