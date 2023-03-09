import type { Path } from '@nodes/Root';
import type Source from '@nodes/Source';
import type Caret from './Caret';
import Node from '@nodes/Node';

type EditEvent = [string, number | Path];

const HistoryLimit = 512;

export default class EditHistory {
    /** The series of edit events. Most recent events are at the end. */
    #history: EditEvent[] = [];

    /** The index of the state to undo next. */
    #index: number = 0;

    constructor() {}

    add(source: Source, caret: Caret) {
        // Is the undo pointer before the end? Trim the history.
        if (this.#index >= 0 && this.#index < this.#history.length)
            this.#history.splice(
                this.#index,
                this.#history.length - this.#index
            );

        // Is the length of the history great than the limit? Trim it.
        if (this.#history.length > HistoryLimit)
            this.#history.splice(0, HistoryLimit - this.#history.length);

        // Add the new entry to the history.
        this.#history.push([
            source.code.toString(),
            caret.position instanceof Node
                ? source.root.getPath(caret.position)
                : caret.position,
        ]);

        // Reset the pointer to the end of the history
        this.#index = this.#history.length;
    }

    undo() {}

    redo() {}
}
