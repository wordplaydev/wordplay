import Caret from "../models/Caret";
import type Program from "../nodes/Program";
import Node from "../nodes/Node";
import Token from "../nodes/Token";
import { AND_SYMBOL, BORROW_SYMBOL, CONVERT_SYMBOL, FALSE_SYMBOL, FUNCTION_SYMBOL, NOT_SYMBOL, OR_SYMBOL, PLACEHOLDER_SYMBOL, SHARE_SYMBOL, STREAM_SYMBOL, TRUE_SYMBOL, TYPE_SYMBOL, TYPE_VAR_SYMBOL } from "../parser/Tokenizer";
import type Source from "../models/Source";

export type Edit = Caret | [ Source, Caret] | undefined;

export type Command = {
    description: string,
    key?: string,
    shift?: boolean,
    alt?: boolean,
    control?: boolean,
    execute: (caret: Caret, editor: HTMLElement, key: string) => Edit | Promise<Edit>
}

export function getTokenByView(program: Program, tokenView: Element) {
    if(tokenView instanceof HTMLElement && tokenView.dataset.id !== undefined) {
        const node = program.getNodeByID(parseInt(tokenView.dataset.id));
        return node instanceof Token ? node : undefined;
    }
    return undefined;
}

function caretVertical(editor: HTMLElement, caret: Caret, direction: 1 | -1): Edit {

    if(caret.position instanceof Node) return;

    // Find the start of the previous line.
    let position = caret.position;
    if(direction < 0) {
        // Keep moving previous while the symbol before isn't a newline.
        while(caret.getCode().at(position - 1) !== undefined && caret.getCode().at(position - 1) !== "\n") position--;
        // Move the before the newline to the line above.
        position--;
        // Move to the beginning of this line.
        while(caret.getCode().at(position - 1) !== undefined && caret.getCode().at(position - 1) !== "\n") position--;
    }
    else {
        // If we're at a newline, just move forward past it to the beginning of the next line.
        if(caret.getCode().at(position) === "\n") position++;
        // Otherwise, move forward until we find a newline, then move past it.
        else {
            while(caret.getCode().at(position) !== undefined && caret.getCode().at(position) !== "\n") position++;
            position++;
        }
    }

    // If we hit the beginning, set the position to the beginning.
    if(position < 0) return caret.withPosition(0);
    // If we hit the end, set the position to the end.
    if(position >= caret.getCode().getLength()) return caret.withPosition(caret.getCode().getLength());
    
    // Get the starting token on this line.
    let currentToken: Token | undefined = caret.getProgram().nodes().find(token => token instanceof Token && token.containsPosition(position as number)) as Token | undefined;
    if(currentToken === undefined) return;

    const index = currentToken.getTextIndex();
    // If the position is on a different line from the current token, just move to the line.
    if(index !== undefined && position < index - currentToken.precedingSpaces) {
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
            currentToken = caret.source.getNextToken(currentToken, 1);
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

function insertChar(caret: Caret, char: string): Edit {
    if(typeof caret.position === "number") {
        const newProject = caret.source.withCharacterAt(char, caret.position);
        return newProject === undefined ? undefined : [ newProject, new Caret(newProject, caret.position + char.length) ];
    }
}

function backspace(caret: Caret): Edit {
    if(typeof caret.position === "number") {
        const newProject = caret.source.withoutGraphemeAt(caret.position - 1);
        return newProject === undefined ? undefined : [ newProject , new Caret(newProject, Math.max(0, caret.position - 1)) ];
    } 
    // If it's a node, delete the text between the first and last token.
    else {
        const tokens = caret.position.nodes(n => n instanceof Token) as Token[];
        if(tokens.length > 0) {
            const start = tokens[0].getTextIndex();
            const end = tokens[tokens.length - 1].getLastIndex();
            if(start !== undefined && end !== undefined) {
                const newProject = caret.source.withoutGraphemesBetween(start, end);
                return newProject === undefined ? undefined : [ newProject , new Caret(newProject, start) ];
            }
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
        alt: false,
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
        description: `Insert reaction symbol (${STREAM_SYMBOL})`,
        alt: true, key: "KeyD",
        execute: (caret: Caret) => insertChar(caret, STREAM_SYMBOL)
    },
    {
        description: `Insert borrow symbol (${BORROW_SYMBOL})`,
        alt: true, key: "ArrowDown",
        execute: (caret: Caret) => insertChar(caret, BORROW_SYMBOL)
    },
    {
        description: `Insert convert symbol (${CONVERT_SYMBOL})`,
        alt: true, key: "ArrowRight",
        execute: (caret: Caret) => insertChar(caret, CONVERT_SYMBOL)
    },
    {
        description: `Insert share symbol (${SHARE_SYMBOL})`,
        alt: true, key: "ArrowUp",
        execute: (caret: Caret) => insertChar(caret, SHARE_SYMBOL)
    },
    {
        description: `Insert infinity symbol (∞)`,
        alt: true, key: "Digit5",
        execute: (caret: Caret) => insertChar(caret, "∞")
    },
    {
        description: "Insert pi symbol (π)",
        alt: true, key: "KeyP",
        execute: (caret: Caret) => insertChar(caret, "π")
    },
    {
        description: `Insert Boolean AND symbol (${AND_SYMBOL})`,
        alt: true, key: "Digit6",
        execute: (caret: Caret) => insertChar(caret, AND_SYMBOL)
    },
    {
        description: `Insert Boolean OR symbol (${OR_SYMBOL})`,
        alt: true, key: "Digit7",
        execute: (caret: Caret) => insertChar(caret, OR_SYMBOL)
    },
    {
        description: `Insert type symbol (${TYPE_SYMBOL})`,
        shift: false, alt: true, key: "Digit8",
        execute: (caret: Caret) => insertChar(caret, TYPE_SYMBOL)
    },
    {
        description: `Insert type symbol (${TYPE_VAR_SYMBOL})`,
        shift: true, alt: true, key: "Digit8",
        execute: (caret: Caret) => insertChar(caret, TYPE_VAR_SYMBOL)
    },
    {
        description: `Insert true symbol (${TRUE_SYMBOL})`,
        alt: true, key: "Digit9",
        execute: (caret: Caret) => insertChar(caret, TRUE_SYMBOL)
    },
    {
        description: `Insert false symbol (${FALSE_SYMBOL})`,
        alt: true, key: "Digit0",
        execute: (caret: Caret) => insertChar(caret, FALSE_SYMBOL)
    },
    {
        description: "Insert not equal symbol (≠)",
        alt: true, key: "Equal",
        execute: (caret: Caret) => insertChar(caret, "≠")
    },
    {
        description: `Insert function symbol (${FUNCTION_SYMBOL})`,
        alt: true, key: "KeyF",
        execute: (caret: Caret) => insertChar(caret, FUNCTION_SYMBOL)
    },
    {
        description: `Insert Boolean NOT symbol (${NOT_SYMBOL})`,
        alt: true, key: "Backquote",
        execute: (caret: Caret) => insertChar(caret, NOT_SYMBOL)
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
        description: `Insert placeholder symbol (${PLACEHOLDER_SYMBOL})`,
        alt: true, key: "Semicolon",
        execute: (caret: Caret) => insertChar(caret, PLACEHOLDER_SYMBOL)
    },
    {
        description: "Insert multiply symbol (×)",
        alt: true, key: "KeyX",
        execute: (caret: Caret) => insertChar(caret, "×")
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
    },
    {
        description: "Copy",
        key: "KeyC",
        execute: async (caret: Caret) => {

            if(!(caret.position instanceof Node)) return undefined;

            // Set the OS clipboard.
            if(navigator.clipboard) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        "text/plain": new Blob([ caret.position.toWordplay() ], { type: "text/plain" })
                    })
                ]);
            }
            return undefined;
        }
    },
    {
        description: "Paste",
        key: "KeyV",
        execute: async (caret: Caret) => {

            // See if there's something on the clipboard.
            if(navigator.clipboard === undefined) return undefined;

            const items = await navigator.clipboard.read();
            for(const item of items) {
                for(const type of item.types) {
                    if(type === "text/plain") {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        return insertChar(caret, text);
                    }
                }
            }
            return undefined;

        }
    }
];

export default commands;