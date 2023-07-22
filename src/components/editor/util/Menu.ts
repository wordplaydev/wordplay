import Revision from '../../../edit/Revision';
import type LanguageCode from '@locale/LanguageCode';
import type Caret from '../../../edit/Caret';
import type { Edit } from './Commands';
import type Purpose from '../../../concepts/Purpose';
import type ConceptIndex from '../../../concepts/ConceptIndex';

export type MenuSelection = [number, number | undefined];
export type MenuOrganization = (Revision | RevisionSet)[];

/** An immutable container for menu state. */
export default class Menu {
    /** The caret at which the menu was generated. */
    private readonly caret: Caret;

    /** The transforms generated from the caret */
    private readonly revisions: Revision[];

    /** The concept index, for organizing revisions */
    private readonly concepts: ConceptIndex;

    /** The currently selected revision or revision set */
    private readonly selection: MenuSelection;

    /** The function to call to perform the edit. Can take an edit to perform, a revision set to select, and returns true if it should hide the menu. */
    private readonly edit: (edit: Edit | RevisionSet | undefined) => boolean;

    /**
     * The derived organization of the menu from the flat list of revisions given
     * It's a list of Revisions and Revision lists, where each revision list represents
     * */
    private readonly organization: MenuOrganization;

    constructor(
        caret: Caret,
        revisions: Revision[],
        organization: MenuOrganization | undefined,
        concepts: ConceptIndex,
        selection: [number, number | undefined],
        edit: (edit: Edit | RevisionSet | undefined) => boolean
    ) {
        this.caret = caret;
        this.revisions = revisions;
        this.concepts = concepts;
        this.selection = selection;
        this.edit = edit;

        if (organization === undefined) {
            // The organization is divided into the following groups and order:
            // 1. Anything involving a reference (e.g., revisions that insert a Refer)
            // 2. RevisionSets organized by node kind, or the single Revision if there's only one, sorted by Purpose.
            // 3. Any removals, which are likely the least relevant.
            // RevisionSets are organized alphabetically by locale.
            const completions = this.revisions.filter((revision) =>
                revision.isCompletion()
            );
            const removals = this.revisions.filter((revision) =>
                revision.isRemoval()
            );
            const others = this.revisions.filter(
                (revision) => !revision.isCompletion() && !revision.isRemoval()
            );
            const kinds: Map<Purpose, Revision[]> = new Map();
            for (const other of others) {
                const node = other.getNewNode([]);
                const purpose =
                    node === undefined
                        ? undefined
                        : this.concepts.getRelevantConcept(node)?.getPurpose();
                if (purpose) {
                    const revisions = kinds.get(purpose);
                    if (revisions) kinds.set(purpose, [...revisions, other]);
                    else kinds.set(purpose, [other]);
                }
            }

            organization = [
                ...completions,
                ...Array.from(kinds.entries()).map(([purpose, revisions]) =>
                    revisions.length === 1
                        ? revisions[0]
                        : new RevisionSet(purpose, revisions)
                ),
                ...removals,
            ];
        }

        this.organization = organization;
    }

    withSelection(selection: MenuSelection) {
        const [index, subindex] = selection;
        const submenu = this.organization[index];

        return new Menu(
            this.caret,
            this.revisions,
            this.organization,
            this.concepts,
            [
                Math.max(0, Math.min(index, this.organization.length - 1)),
                submenu instanceof RevisionSet && subindex !== undefined
                    ? Math.max(0, Math.min(subindex, submenu.size()))
                    : undefined,
            ],
            this.edit
        );
    }

    getCaret(): Caret {
        return this.caret;
    }

    getOrganization() {
        return this.organization;
    }

    /** Either the top level list or a sublist */
    getRevisionList(): (Revision | RevisionSet)[] {
        const [index, subindex] = this.selection;
        const submenu = this.organization[index];
        return submenu instanceof Revision || subindex === undefined
            ? this.organization
            : submenu.revisions;
    }

    /** Whether there is a selection */
    hasSelection(): boolean {
        return this.getSelection() !== undefined;
    }

    /** The current selection, if there is one. */
    getSelection(): Revision | RevisionSet | undefined {
        const [index, subindex] = this.selection;
        const submenu = this.organization[index];

        return submenu instanceof Revision ||
            (submenu instanceof RevisionSet && subindex === undefined)
            ? submenu
            : subindex !== undefined
            ? submenu.revisions[subindex]
            : undefined;
    }

    /** Get a unique identifier for the selection, for use by a UI */
    getSelectionID() {
        const [index, subindex] = this.selection;
        return subindex ?? index;
    }

    /** The number of revisions in the menu. */
    size() {
        return this.revisions.length;
    }

    down() {
        return this.move(1);
    }

    up() {
        return this.move(-1);
    }

    move(direction: -1 | 1) {
        const [index, subindex] = this.selection;
        const submenu = this.organization[index];

        if (subindex === undefined) {
            const newIndex = index + direction;
            return newIndex >= 0 && newIndex < this.organization.length
                ? new Menu(
                      this.caret,
                      this.revisions,
                      this.organization,
                      this.concepts,
                      [newIndex, undefined],
                      this.edit
                  )
                : this;
        } else if (submenu instanceof RevisionSet) {
            const newSubindex = subindex + direction;
            return newSubindex >= 0 && newSubindex < submenu.size()
                ? new Menu(
                      this.caret,
                      this.revisions,
                      this.organization,
                      this.concepts,
                      [index, newSubindex],
                      this.edit
                  )
                : this;
        } else return this;
    }

    /** If in a submenu, change selection to be out of it. */
    out() {
        return this.selection[1] !== undefined
            ? new Menu(
                  this.caret,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.edit
              )
            : this;
    }

    /** If on a submenu item, but not in it, enter it. */
    in() {
        return this.getSelection() instanceof RevisionSet &&
            this.selection[1] === undefined
            ? new Menu(
                  this.caret,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], 0],
                  this.edit
              )
            : this;
    }

    doEdit(languages: LanguageCode[], revision?: Revision | RevisionSet) {
        if (revision === undefined) revision = this.getSelection();
        return revision
            ? this.edit(
                  revision instanceof Revision
                      ? revision.getEdit(languages)
                      : revision
              )
            : false;
    }
}

export class RevisionSet {
    readonly purpose: Purpose;
    readonly revisions: Revision[];

    constructor(purpose: Purpose, revisions: Revision[]) {
        this.purpose = purpose;
        this.revisions = revisions;
    }

    size() {
        return this.revisions.length;
    }
}
