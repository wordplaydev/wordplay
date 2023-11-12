import Revision from '../../../edit/Revision';
import type Caret from '../../../edit/Caret';
import type { Edit } from './Commands';
import type Purpose from '@concepts/Purpose';
import type ConceptIndex from '@concepts/ConceptIndex';
import Literal from '@nodes/Literal';
import type Locales from '@locale/Locales';

export type MenuSelection = [number, number | undefined];
export type MenuOrganization = (Revision | RevisionSet)[];

// A relevance ordering of purposes.

const PurposeRelevance: Record<Purpose, number> = {
    project: 0,
    value: 1,
    evaluate: 2,
    input: 3,
    output: 4,
    decide: 5,
    convert: 6,
    bind: 7,
    type: 8,
    document: 9,
    source: 10,
};

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

    /** The function to call to perform the edit. Can take"
     * 1) an edit to perform,
     * 2) a revision set to select, entering a submenu,
     * 3)
     * Should return true if it should hide the menu after the edit.
     * */
    private readonly action: (
        selection: Edit | RevisionSet | undefined
    ) => boolean;

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
        action: (selection: Edit | RevisionSet | undefined) => boolean
    ) {
        this.caret = caret;
        this.revisions = revisions;
        this.concepts = concepts;
        this.selection = selection;
        this.action = action;

        if (organization === undefined) {
            // The organization is divided into the following groups and order:
            // 1. Anything involving a reference (e.g., revisions that insert a Refer)
            // 2. RevisionSets organized by node kind, or the single Revision if there's only one, sorted by Purpose.
            // 3. Any removals, which are likely the least relevant.
            // RevisionSets are organized alphabetically by locale.
            const priority = this.revisions.filter(
                (revision) =>
                    revision.isCompletion(this.concepts.locales) ||
                    revision.getNewNode(this.concepts.locales) instanceof
                        Literal
            );
            const removals = this.revisions.filter((revision) =>
                revision.isRemoval()
            );
            const others = this.revisions.filter(
                (revision) =>
                    !priority.includes(revision) && !revision.isRemoval()
            );
            const kinds: Map<Purpose, Revision[]> = new Map();
            for (const other of others) {
                const node = other.getNewNode(this.concepts.locales);
                if (node) {
                    const purpose = node.getPurpose();
                    const revisions = kinds.get(purpose);
                    if (revisions) kinds.set(purpose, [...revisions, other]);
                    else kinds.set(purpose, [other]);
                }
            }

            organization = [
                ...priority,
                ...Array.from(kinds.entries())
                    .sort(
                        (a, b) =>
                            PurposeRelevance[a[0]] - PurposeRelevance[b[0]]
                    )
                    .map(
                        ([purpose, revisions]) =>
                            new RevisionSet(purpose, revisions)
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
            this.action
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

    inSubmenu() {
        return this.selection[1] !== undefined;
    }

    onBack() {
        return this.selection[1] === -1;
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

    getSelectionIndex() {
        return this.selection;
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
                      this.action
                  )
                : this;
        } else if (submenu instanceof RevisionSet) {
            const newSubindex = subindex + direction;
            return newSubindex >= -1 && newSubindex < submenu.size()
                ? new Menu(
                      this.caret,
                      this.revisions,
                      this.organization,
                      this.concepts,
                      [index, newSubindex],
                      this.action
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
                  this.action
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
                  this.action
              )
            : this;
    }

    back() {
        return this.selection[1] !== undefined
            ? new Menu(
                  this.caret,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.action
              )
            : this;
    }

    doEdit(locales: Locales, revision: Revision | RevisionSet | undefined) {
        if (revision === undefined) return this.action(undefined);
        return revision
            ? this.action(
                  revision instanceof Revision
                      ? revision.getEdit(locales)
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
