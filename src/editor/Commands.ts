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

function caretVertical(editor: HTMLElement, caret: Caret, direction: 1 | -1): Caret | undefined {

    if(caret.position instanceof Node) return;

    // Find the start of the previous line.
    let position = caret.position;
    if(direction < 0) {
        // Keep moving previous while the symbol before isn't a newline.
        while(caret.project.code.at(position - 1) !== undefined && caret.project.code.at(position - 1) !== "\n") position--;
        // Move the before the newline to the line above.
        position--;
        // Move to the beginning of this line.
        while(caret.project.code.at(position - 1) !== undefined && caret.project.code.at(position - 1) !== "\n") position--;
    }
    else {
        // If we're at a newline, just move forward past it to the beginning of the next line.
        if(caret.project.code.at(position) === "\n") position++;
        // Otherwise, move forward until we find a newline, then move past it.
        else {
            while(caret.project.code.at(position) !== undefined && caret.project.code.at(position) !== "\n") position++;
            position++;
        }
    }

    // If we hit the beginning, set the position to the beginning.
    if(position < 0) return caret.withPosition(0);
    // If we hit the end, set the position to the end.
    if(position >= caret.project.code.getLength()) return caret.withPosition(caret.project.code.getLength());
    
    // Get the starting token on this line.
    let currentToken: Token | undefined = caret.getProgram().nodes().find(token => token instanceof Token && token.containsPosition(position as number)) as Token | undefined;
    if(currentToken === undefined) return;

    // If the position is on a different line from the current token, just move to the line.
    if(position < currentToken.getTextIndex() - currentToken.precedingSpaces) {
        return caret.withPosition(position);
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
            currentToken = caret.project.getNextToken(currentToken, 1);
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
                return caret.withPosition(startPosition + offset);
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