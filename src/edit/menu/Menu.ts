import type ConceptIndex from '@concepts/ConceptIndex';
import Purpose from '@concepts/Purpose';
import type Project from '@db/projects/Project';
import { type CaretPosition } from '@edit/Caret';
import type Locales from '@locale/Locales';
import NameType from '@nodes/NameType';
import type { FieldPosition } from '@nodes/Node';
import Reference from '@nodes/Reference';
import type Source from '@nodes/Source';
import Token from '@nodes/Token';
import type { Edit } from '../../components/editor/commands/Commands';
import Revision from '../revision/Revision';

/** The first number is the selected revision or revision set, the second number is the optional revision in a selected revision set. */
export type MenuSelection = [number, number | undefined];
export type MenuOrganization = (Revision | RevisionSet)[];

// A relevance ordering of purposes.

const PurposeRelevance: Record<Purpose, number> = {
    Project: 0,
    Outputs: 1,
    Inputs: 2,
    Decisions: 3,
    Text: 4,
    Numbers: 5,
    Truth: 6,
    Definitions: 7,
    Lists: 8,
    Maps: 9,
    Tables: 10,
    Documentation: 13,
    Types: 14,
    Advanced: 15,
    Hidden: 16,
    How: 16,
};

/** An immutable container for menu state. */
export default class Menu {
    /** The project this menu was generated for */
    private readonly project: Project;

    /** The source in which the menu was requested */
    private readonly source: Source;

    /** The caret at which the menu was generated. */
    private readonly anchor: CaretPosition | FieldPosition;

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
        selection: Edit | RevisionSet | undefined,
    ) => boolean;

    /**
     * The derived organization of the menu from the flat list of revisions given
     * It's a list of Revisions and Revision lists, where each revision list represents
     * */
    private readonly organization: MenuOrganization;

    constructor(
        project: Project,
        source: Source,
        anchor: CaretPosition | FieldPosition,
        revisions: Revision[],
        organization: MenuOrganization | undefined,
        concepts: ConceptIndex,
        selection: [number, number | undefined],
        action: (selection: Edit | RevisionSet | undefined) => boolean,
    ) {
        this.project = project;
        this.source = source;
        this.anchor = anchor;
        this.revisions = revisions;
        this.concepts = concepts;
        this.selection = selection;
        this.action = action;

        if (organization === undefined) {
            const visibleRevisions = this.revisions.filter(
                (revision) =>
                    revision.getPurpose(this.concepts) !== Purpose.Hidden ||
                    revision.getNewNode(this.concepts.locales) instanceof Token,
            );

            // The organization is divided into the following groups and order:
            // 1. Anything involving a reference (e.g., revisions that insert a Refer)
            // 2. RevisionSets organized by node kind, or the single Revision if there's only one, sorted by Purpose.
            // 3. Any removals, which are likely the least relevant.
            // RevisionSets are organized alphabetically by locale.
            const priority = visibleRevisions.filter((revision) => {
                if (revision.isCompletion(this.concepts.locales)) return true;
                const newNode = revision.getNewNode(this.concepts.locales);
                return (
                    newNode instanceof Reference || newNode instanceof NameType
                );
            });
            const removals = visibleRevisions.filter((revision) =>
                revision.isRemoval(),
            );
            const others = visibleRevisions.filter(
                (revision) =>
                    !priority.includes(revision) && !revision.isRemoval(),
            );

            // Organize by purpose.
            const kinds: Map<Purpose, Revision[]> = new Map();
            for (const other of others) {
                const purpose = other.getPurpose(this.concepts);
                if (purpose !== undefined) {
                    const revisions = kinds.get(purpose);
                    if (revisions) kinds.set(purpose, [...revisions, other]);
                    else kinds.set(purpose, [other]);
                }
            }

            // Make an sorted array of the revision sets.
            const grouped = Array.from(kinds.entries())
                .toSorted(
                    (a, b) => PurposeRelevance[a[0]] - PurposeRelevance[b[0]],
                )
                .map(
                    ([purpose, revisions]) =>
                        new RevisionSet(purpose, revisions),
                );

            organization = [
                ...priority,
                ...// We only do this grouping if there are more than 7 other revisions and more than 1 group
                (others.length > 7 && kinds.size > 1
                    ? grouped
                    : grouped.flatMap((set) => set.revisions)),
                ...removals,
            ];
        }

        this.organization = organization;
    }

    getProject() {
        return this.project;
    }

    getSource(): Source {
        return this.source;
    }

    getAnchor(): CaretPosition | FieldPosition {
        return this.anchor;
    }

    withSelection(selection: MenuSelection) {
        const [index, subindex] = selection;
        const submenu = this.organization[index];

        return new Menu(
            this.project,
            this.source,
            this.anchor,
            this.revisions,
            this.organization,
            this.concepts,
            [
                Math.max(0, Math.min(index, this.organization.length - 1)),
                submenu instanceof RevisionSet && subindex !== undefined
                    ? Math.max(0, Math.min(subindex, submenu.size()))
                    : undefined,
            ],
            this.action,
        );
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
        return index + (subindex === undefined ? '' : `-${subindex}`);
    }

    getSelectionFor(revision: Revision): MenuSelection | undefined {
        const org = this.organization;
        const index = org.indexOf(revision);
        if (index >= 0) return [index, undefined];

        const set = org.find(
            (item): item is RevisionSet =>
                item instanceof RevisionSet &&
                item.revisions.includes(revision),
        );
        if (set === undefined) return undefined;
        return [org.indexOf(set), set.revisions.indexOf(revision)];
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
                      this.project,
                      this.source,
                      this.anchor,
                      this.revisions,
                      this.organization,
                      this.concepts,
                      [newIndex, undefined],
                      this.action,
                  )
                : this;
        } else if (submenu instanceof RevisionSet) {
            const newSubindex = subindex + direction;
            return newSubindex >= -1 && newSubindex < submenu.size()
                ? new Menu(
                      this.project,
                      this.source,
                      this.anchor,
                      this.revisions,
                      this.organization,
                      this.concepts,
                      [index, newSubindex],
                      this.action,
                  )
                : this;
        } else return this;
    }

    /** If in a submenu, change selection to be out of it. */
    out() {
        return this.selection[1] !== undefined
            ? new Menu(
                  this.project,
                  this.source,
                  this.anchor,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.action,
              )
            : this;
    }

    /** If on a submenu item, but not in it, enter it. */
    in() {
        return this.getSelection() instanceof RevisionSet &&
            this.selection[1] === undefined
            ? new Menu(
                  this.project,
                  this.source,
                  this.anchor,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], 0],
                  this.action,
              )
            : this;
    }

    back() {
        return this.selection[1] !== undefined
            ? new Menu(
                  this.project,
                  this.source,
                  this.anchor,
                  this.revisions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.action,
              )
            : this;
    }

    doEdit(locales: Locales, revision: Revision | RevisionSet | undefined) {
        if (revision === undefined) return this.action(undefined);
        return revision
            ? this.action(
                  revision instanceof Revision
                      ? revision.getEdit(locales)
                      : revision,
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
