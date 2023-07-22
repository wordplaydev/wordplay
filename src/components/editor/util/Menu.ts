import type Revision from '../../../edit/Revision';
import type LanguageCode from '@locale/LanguageCode';
import type Caret from '../../../edit/Caret';
import type { Edit } from './Commands';

/** An immutable container for menu state. */
export default class Menu {
    /** The caret at which the menu was generated. */
    private readonly caret: Caret;

    /** The transforms generated from the caret */
    private readonly revisions: Revision[];

    /** The currently selected transform */
    private readonly selection: number;

    /** The function to call to perform the edit */
    private readonly edit: (edit: Edit | undefined) => void;

    constructor(
        caret: Caret,
        revisions: Revision[],
        selection: number,
        edit: (edit: Edit | undefined) => void
    ) {
        this.caret = caret;
        this.revisions = revisions;
        this.selection = selection;
        this.edit = edit;
    }

    withSelection(index: number) {
        return new Menu(
            this.caret,
            this.revisions,
            Math.max(0, Math.min(index, this.revisions.length - 1)),
            this.edit
        );
    }

    getCaret(): Caret {
        return this.caret;
    }

    getRevisions(): Revision[] {
        return this.revisions;
    }

    /** Whether there is a selection */
    hasSelection(): boolean {
        return this.getSelection() !== undefined;
    }

    /** The current selection, if there is one. */
    getSelection(): Revision | undefined {
        return this.revisions[this.selection];
    }

    /** Get a unique identifier for the selection, for use by a UI */
    getSelectionID() {
        return this.selection;
    }

    /** The number of revisions in the menu. */
    size() {
        return this.revisions.length;
    }

    down() {
        return this.selection === undefined
            ? new Menu(this.caret, this.revisions, 0, this.edit)
            : this.selection < this.revisions.length - 1
            ? new Menu(
                  this.caret,
                  this.revisions,
                  this.selection + 1,
                  this.edit
              )
            : this;
    }

    up() {
        return this.selection !== undefined && this.selection > 0
            ? new Menu(
                  this.caret,
                  this.revisions,
                  this.selection - 1,
                  this.edit
              )
            : this;
    }

    doEdit(languages: LanguageCode[], transform?: Revision) {
        return this.edit(
            this.selection === undefined
                ? undefined
                : (transform ?? this.revisions[this.selection]).getEdit(
                      languages
                  )
        );
    }
}
