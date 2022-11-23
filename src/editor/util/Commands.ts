import type Caret from "../../models/Caret";
import Node from "../../nodes/Node";
import { AND_SYMBOL, BORROW_SYMBOL, CONVERT_SYMBOL, FALSE_SYMBOL, FUNCTION_SYMBOL, NOT_SYMBOL, OR_SYMBOL, PLACEHOLDER_SYMBOL, SHARE_SYMBOL, REACTION_SYMBOL, TRUE_SYMBOL, TYPE_SYMBOL, TYPE_VAR_SYMBOL, PREVIOUS_SYMBOL } from "../../parser/Tokenizer";
import type Source from "../../models/Source";

export type Edit = Caret | [ Source, Caret] | undefined;

export type Command = {
    description: string,
    key?: string,
    shift?: boolean,
    alt?: boolean,
    control?: boolean,
    execute: (caret: Caret, editor: HTMLElement, key: string) => Edit | Promise<Edit>
}

const commands: Command[] = [
    {
        description: "Move caret up a line to the closest horizontal position visually",
        alt: false,
        key: "ArrowUp",
        execute: (caret: Caret, editor: HTMLElement) => caret.moveVertical(editor, -1)
    },
    {
        description: "Move caret down a line to the closest horizontal position visually",
        alt: false,
        key: "ArrowDown",
        execute: (caret: Caret, editor: HTMLElement) => caret.moveVertical(editor, 1)
    },
    {
        description: "Select the entire program",
        control: true,
        key: "KeyA",
        execute: (caret: Caret) => caret.withPosition(caret.getProgram())
    },
    {
        description: "Move the caret one position left",
        alt: false,
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
                // Select the parent node
                let parent: Node | undefined | null = caret.source.get(position)?.getParent();
                // // What tokens are selected currently?
                // const selectedTokens = position.nodes(n => n instanceof Token) as Token[];
                // let parentTokens = parent?.nodes(n => n instanceof Token) as Token[];
                // // While the parent's nodes are equivalent to the previous selection, keep going up the hierarchy.
                // while(parent && parentTokens.length === selectedTokens.length && !(parent instanceof ExpressionPlaceholder) && parentTokens.every((t, i) => t === selectedTokens[i])) {
                //     const newParent = parent.getParent();
                //     if(newParent) {
                //         parent = newParent;
                //         parentTokens = parent.nodes(n => n instanceof Token) as Token[];
                //     }
                //     else break;
                // }
                // If we still have a parent, 
                if(parent)
                    return caret.withPosition(parent);
            }
            // Find the node corresponding to the position.
            // And if it's parent only has the one child, select it.
            else {
                const token = caret.getToken();
                if(token !== undefined) {
                    const parent = caret.source.get(token)?.getParent();
                    return caret.withPosition(parent?.getChildren()[0] === token ? parent : token);
                }
            }
        }        
    },
    {
        description: `Insert reaction symbol (${REACTION_SYMBOL})`,
        alt: true, key: "KeyD",
        execute: (caret: Caret) => caret.insert(REACTION_SYMBOL)
    },
    {
        description: `Insert borrow symbol (${BORROW_SYMBOL})`,
        alt: true, key: "ArrowDown",
        execute: (caret: Caret) => caret.insert(BORROW_SYMBOL)
    },
    {
        description: `Insert previous symbol (${PREVIOUS_SYMBOL})`,
        alt: true, key: "ArrowLeft",
        execute: (caret: Caret) => caret.insert(PREVIOUS_SYMBOL)
    },
    {
        description: `Insert convert symbol (${CONVERT_SYMBOL})`,
        alt: true, key: "ArrowRight",
        execute: (caret: Caret) => caret.insert(CONVERT_SYMBOL)
    },
    {
        description: `Insert share symbol (${SHARE_SYMBOL})`,
        alt: true, key: "ArrowUp",
        execute: (caret: Caret) => caret.insert(SHARE_SYMBOL)
    },
    {
        description: `Insert infinity symbol (∞)`,
        alt: true, key: "Digit5",
        execute: (caret: Caret) => caret.insert("∞")
    },
    {
        description: "Insert pi symbol (π)",
        alt: true, key: "KeyP",
        execute: (caret: Caret) => caret.insert("π")
    },
    {
        description: `Insert Boolean AND symbol (${AND_SYMBOL})`,
        alt: true, key: "Digit6",
        execute: (caret: Caret) => caret.insert(AND_SYMBOL)
    },
    {
        description: `Insert Boolean OR symbol (${OR_SYMBOL})`,
        alt: true, key: "Digit7",
        execute: (caret: Caret) => caret.insert(OR_SYMBOL)
    },
    {
        description: `Insert type symbol (${TYPE_SYMBOL})`,
        shift: false, alt: true, key: "Digit8",
        execute: (caret: Caret) => caret.insert(TYPE_SYMBOL)
    },
    {
        description: `Insert type symbol (${TYPE_VAR_SYMBOL})`,
        shift: true, alt: true, key: "Digit8",
        execute: (caret: Caret) => caret.insert(TYPE_VAR_SYMBOL)
    },
    {
        description: `Insert true symbol (${TRUE_SYMBOL})`,
        alt: true, key: "Digit9",
        execute: (caret: Caret) => caret.insert(TRUE_SYMBOL)
    },
    {
        description: `Insert false symbol (${FALSE_SYMBOL})`,
        alt: true, key: "Digit0",
        execute: (caret: Caret) => caret.insert(FALSE_SYMBOL)
    },
    {
        description: "Insert not equal symbol (≠)",
        alt: true, key: "Equal",
        execute: (caret: Caret) => caret.insert("≠")
    },
    {
        description: `Insert function symbol (${FUNCTION_SYMBOL})`,
        alt: true, key: "KeyF",
        execute: (caret: Caret) => caret.insert(FUNCTION_SYMBOL)
    },
    {
        description: `Insert Boolean NOT symbol (${NOT_SYMBOL})`,
        alt: true, key: "Digit1",
        execute: (caret: Caret) => caret.insert(NOT_SYMBOL)
    },
    {
        description: "Insert less than or equal to symbol (≤)",
        alt: true, key: "Comma",
        execute: (caret: Caret) => caret.insert("≤")
    },
    {
        description: "Insert greater than or equal to symbol (≥)",
        alt: true, key: "Period",
        execute: (caret: Caret) => caret.insert("≥")
    },
    {
        description: `Insert placeholder symbol (${PLACEHOLDER_SYMBOL})`,
        alt: true, key: "Semicolon",
        execute: (caret: Caret) => caret.insert(PLACEHOLDER_SYMBOL)
    },
    {
        description: "Insert multiply symbol (×)",
        alt: true, key: "KeyX",
        execute: (caret: Caret) => caret.insert("×")
    },
    {
        description: "Insert divide symbol (÷)",
        alt: true, key: "Slash",
        execute: (caret: Caret) => caret.insert("÷")
    },
    {
        description: "Insert new line",
        key: "Enter",
        execute: (caret: Caret) => caret.insert("\n")
    },
    {
        description: "Insert tab",
        key: "Tab",
        execute: (caret: Caret) => caret.insert("\t")
    },
    {
        description: "Delete previous character",
        key: "Backspace",
        execute: (caret: Caret) => caret.backspace()
    },
    {
        description: "Copy",
        control: true,
        key: "KeyC",
        execute: (caret: Caret) => {

            if(!(caret.position instanceof Node)) return undefined;

            // Set the OS clipboard.
            if(navigator.clipboard) {
                return navigator.clipboard.write([
                    new ClipboardItem({
                        "text/plain": new Blob([ caret.position.withPrecedingSpace("", true).toWordplay() ], { type: "text/plain" })
                    })
                ]).then(() => undefined);
            }
            return undefined;
        }
    },
    {
        description: "Paste",
        control: true,
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
                        return caret.insert(text);
                    }
                }
            }
            return undefined;

        }
    }
];

export default commands;