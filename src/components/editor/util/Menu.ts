import type Revision from '../../../edit/Revision';
import type LanguageCode from '@locale/LanguageCode';
import type Caret from '../../../edit/Caret';
import type { Edit } from './Commands';

/** An immutable container for menu state. */
export default class Menu {
    /** The caret at which the menu was generated. */
    readonly caret: Caret;

    /** The transforms generated from the caret */
    readonly transforms: Revision[];

    /** The currently selected transform */
    readonly selection: number;

    /** The function to call to perform the edit */
    readonly edit: (edit: Edit | undefined) => void;

    constructor(
        caret: Caret,
        transforms: Revision[],
        selection: number,
        edit: (edit: Edit | undefined) => void
    ) {
        this.caret = caret;
        this.transforms = transforms;
        this.selection = selection;
        this.edit = edit;
    }

    withSelection(index: number) {
        return new Menu(
            this.caret,
            this.transforms,
            Math.max(0, Math.min(index, this.transforms.length - 1)),
            this.edit
        );
    }

    down() {
        return this.selection === undefined
            ? new Menu(this.caret, this.transforms, 0, this.edit)
            : this.selection < this.transforms.length - 1
            ? new Menu(
                  this.caret,
                  this.transforms,
                  this.selection + 1,
                  this.edit
              )
            : this;
    }

    up() {
        return this.selection !== undefined && this.selection > 0
            ? new Menu(
                  this.caret,
                  this.transforms,
                  this.selection - 1,
                  this.edit
              )
            : this;
    }

    doEdit(languages: LanguageCode[], transform?: Revision) {
        return this.edit(
            this.selection === undefined
                ? undefined
                : (transform ?? this.transforms[this.selection]).getEdit(
                      languages
                  )
        );
    }
}
