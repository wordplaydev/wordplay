import { Sym } from '#nodes/Sym.ts';
import type ConceptIndex from '#concepts/ConceptIndex.ts';
import { keysOf } from '#util/nullable.ts';
import { Purpose, type PurposeType } from '#concepts/Purpose.ts';
import { UnitCategories } from '#basis/UnitConversions.ts';
import getUnitGroup, { type UnitGroup } from '#edit/menu/unitCategory.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Project from '#db/projects/Project.ts';
import { type CaretPosition } from '#edit/caret/Caret.ts';
import type Locales from '#locale/Locales.ts';
import type { FieldPosition } from '#nodes/Node.ts';
import Reference from '#nodes/Reference.ts';
import type Source from '#nodes/Source.ts';
import Token from '#nodes/Token.ts';
import type { Edit } from '#components/editor/commands/Commands.ts';
import Append from '#edit/revision/Append.ts';
import Assign from '#edit/revision/Assign.ts';
import MenuAction from '#edit/menu/MenuAction.ts';
import Revision from '#edit/revision/Revision.ts';

/** The first number is the selected revision or revision set, the second number is the optional revision in a selected revision set. */
export type MenuSelection = [number, number | undefined];
export type MenuOrganization = (Revision | RevisionSet | MenuAction)[];

// A relevance ordering of purposes.

const PurposeRelevance: Record<PurposeType, number> = {
    Project: 0,
    // Tied with Project deliberately: both are definitions this program can name right
    // now, which is what relevance is ordering. Whose they are is the group's job to say.
    Kit: 0,
    Outputs: 1,
    Inputs: 2,
    Decisions: 3,
    Text: 4,
    Patterns: 5,
    Numbers: 6,
    Truth: 7,
    Definitions: 8,
    Lists: 9,
    Maps: 10,
    Tables: 11,
    Documentation: 13,
    Types: 14,
    Advanced: 15,
    Hidden: 16,
    How: 16,
    GalleryHow: 16,
};

/** The name token at or just before a text position. A position at a
 *  name's end is "at" whatever follows it (the end token, a space), so the
 *  token before is tried too. */
function nameTokenAt(source: Source, position: number): Token | undefined {
    return [
        source.getTokenAt(position, false),
        source.getTokenAt(position - 1, false),
    ].find((token) => token !== undefined && token.isSymbol(Sym.Name));
}

/**
 * Whether a caret change should re-ask a live menu rather than close it: the
 * caret is a text position still in the name the menu was opened in (`was`,
 * at `anchor`), and typing has extended it. A move elsewhere, deleting back
 * to the name's start, or a character that ends the name closes the menu.
 */
export function liveMenuFollows(
    anchor: CaretPosition | FieldPosition,
    was: Source,
    now: Source,
    position: CaretPosition,
): boolean {
    if (typeof anchor !== 'number' || typeof position !== 'number')
        return false;
    const oldToken = nameTokenAt(was, anchor);
    const oldStart =
        oldToken === undefined
            ? anchor
            : (was.getTokenTextPosition(oldToken) ?? anchor);
    const newToken = nameTokenAt(now, position);
    if (newToken === undefined) return false;
    const newStart = now.getTokenTextPosition(newToken);
    return (
        newStart !== undefined && newStart === oldStart && position > newStart
    );
}

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

    /** What the menu can *do* to the selected node, as opposed to change it
     *  into. Kept apart from the revisions so the grouping below, which asks
     *  every entry for a purpose and a removal, never sees one. */
    private readonly actions: MenuAction[];

    /** The concept index, for organizing revisions */
    private readonly concepts: ConceptIndex;

    /** The currently selected revision or revision set */
    private readonly selection: MenuSelection;

    /** Whether the menu was opened at a text caret and keeps focus in the
     *  editor, so typing narrows it: the editor then routes its keys and
     *  announces its selection, and the menu never takes focus itself. A menu
     *  opened from a field's trigger button is not live; its items take focus.
     *
     *  A live menu opens with nothing selected (index -1): Down enters it, so
     *  until then Enter is still a new line rather than a choice nobody made. */
    private readonly live: boolean;

    /** The function to call to perform the edit. Can take"
     * 1) an edit to perform,
     * 2) a revision set to select, entering a submenu,
     * 3)
     * Should return true if it should hide the menu after the edit.
     * */
    private readonly action: (
        selection: Edit | RevisionSet | undefined,
        /** The revision an edit came from, so the editor can say what it did. */
        revision?: Revision,
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
        actions: MenuAction[],
        organization: MenuOrganization | undefined,
        concepts: ConceptIndex,
        selection: [number, number | undefined],
        action: (
            selection: Edit | RevisionSet | undefined,
            revision?: Revision,
        ) => boolean,
        live = false,
    ) {
        this.live = live;
        this.project = project;
        this.source = source;
        this.anchor = anchor;
        this.revisions = revisions;
        this.actions = actions;
        this.concepts = concepts;
        this.selection = selection;
        this.action = action;

        if (organization === undefined) {
            const visibleRevisions = this.revisions.filter(
                (revision) =>
                    revision.getPurpose(this.concepts) !== Purpose.Hidden ||
                    revision.getNewNode(this.concepts.locales) instanceof
                        Token ||
                    // Field assignments and appends come straight from a grammar field's declared
                    // kinds, so a Hidden node the grammar asks for (a segmenting container like
                    // TypeVariables, offered populated with a starter child) still shows, labeled
                    // by its field. Hidden nodes stay out of replacements and the palette.
                    revision instanceof Assign ||
                    revision instanceof Append,
            );

            // The organization is divided into the following groups and order:
            // 1. Anything involving a reference (e.g., revisions that insert a Refer)
            // 2. RevisionSets organized by node kind, or the single Revision if there's only one, sorted by Purpose.
            // 3. Any removals, which are likely the least relevant.
            // RevisionSets are organized alphabetically by locale.
            const priority = visibleRevisions.filter((revision) => {
                if (revision.isCompletion(this.concepts.locales)) return true;
                const newNode = revision.getNewNode(this.concepts.locales);
                return newNode instanceof Reference;
            });
            const removals = visibleRevisions.filter((revision) =>
                revision.isRemoval(),
            );
            const others = visibleRevisions.filter(
                (revision) =>
                    !priority.includes(revision) && !revision.isRemoval(),
            );

            // Organize by purpose, and within a purpose by group where one applies. Every unit
            // reports Purpose.Numbers, so grouping on purpose alone left one undifferentiated
            // set of 126 units — and, since that was the only purpose present, the `kinds.size`
            // gate below then flattened it into a wall of items with the numbers at the bottom.
            const kinds: Map<
                string,
                {
                    purpose: PurposeType;
                    group: UnitGroup | undefined;
                    revisions: Revision[];
                }
            > = new Map();
            for (const other of others) {
                const purpose = other.getPurpose(this.concepts);
                if (purpose === undefined) continue;
                const newNode = other.getNewNode(this.concepts.locales);
                const group = newNode ? getUnitGroup(newNode) : undefined;
                const key = `${purpose}/${group ?? ''}`;
                const existing = kinds.get(key);
                if (existing) existing.revisions.push(other);
                else kinds.set(key, { purpose, group, revisions: [other] });
            }

            // Make a sorted array of the revision sets. A set with no group comes first within
            // its purpose, so the number suggestions lead and the unit categories follow in the
            // order the conversion table declares them.
            const groupOrder: readonly string[] = keysOf(UnitCategories);
            const rank = (group: UnitGroup | undefined) =>
                group === undefined
                    ? -1
                    : groupOrder.indexOf(group) + 1 || groupOrder.length + 1;
            const grouped = Array.from(kinds.values())
                .toSorted(
                    (a, b) =>
                        PurposeRelevance[a.purpose] -
                            PurposeRelevance[b.purpose] ||
                        rank(a.group) - rank(b.group),
                )
                .map(
                    ({ purpose, group, revisions }) =>
                        new RevisionSet(
                            purpose,
                            revisions,
                            group === undefined
                                ? undefined
                                : (l) => l.basis.Number.category[group],
                        ),
                );

            organization = [
                ...priority,
                ...// We only do this grouping if there are more than 7 other revisions and more than 1 group
                (others.length > 7 && kinds.size > 1
                    ? grouped
                    : grouped.flatMap((set) => set.revisions)),
                ...removals,
                // Last: changing the program is what this menu is for, and an
                // action on the selected node is rarer than any of it. Last
                // also keeps the opening selection ([0, undefined]) on the
                // first suggestion rather than preselecting the action.
                ...this.actions,
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

    isLive(): boolean {
        return this.live;
    }

    /** The DOM id of the menu's list, so the editor's `aria-controls` and the
     *  list can agree without either knowing about the other. */
    getID(): string {
        return `${this.source.getNames()[0] ?? 'source'}-menu`;
    }

    withSelection(selection: MenuSelection) {
        const [index, subindex] = selection;
        const submenu = this.organization[index];

        return new Menu(
            this.project,
            this.source,
            this.anchor,
            this.revisions,
            this.actions,
            this.organization,
            this.concepts,
            [
                // A live menu may have nothing selected (see `live`): -1.
                this.live && index === -1
                    ? -1
                    : Math.max(
                          0,
                          Math.min(index, this.organization.length - 1),
                      ),
                submenu instanceof RevisionSet && subindex !== undefined
                    ? Math.max(0, Math.min(subindex, submenu.size() - 1))
                    : undefined,
            ],
            this.action,
            this.live,
        );
    }

    getOrganization() {
        return this.organization;
    }

    /** Either the top level list or a sublist */
    getRevisionList(): MenuOrganization {
        const [index, subindex] = this.selection;
        const submenu = this.organization[index];
        return submenu === undefined ||
            submenu instanceof Revision ||
            submenu instanceof MenuAction ||
            subindex === undefined
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

    /** The current selection, if there is one. */
    getSelection(): Revision | RevisionSet | MenuAction | undefined {
        const [index, subindex] = this.selection;
        const submenu = this.organization[index];

        return submenu instanceof Revision ||
            submenu instanceof MenuAction ||
            (submenu instanceof RevisionSet && subindex === undefined)
            ? submenu
            : submenu !== undefined && subindex !== undefined
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

    getSelectionFor(
        revision: Revision | MenuAction,
    ): MenuSelection | undefined {
        const org = this.organization;
        const index = org.indexOf(revision);
        if (index >= 0) return [index, undefined];

        // Only a revision is ever inside a set; an action is always top level,
        // so failing to find it above is the whole answer.
        if (!(revision instanceof Revision)) return undefined;

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
            // A live menu opens with nothing selected: down from there enters
            // it, and up from its first item leaves it again. A menu that took
            // focus always has a selection, so it stops at its first item.
            const lowest = this.live ? -1 : 0;
            return newIndex >= lowest && newIndex < this.organization.length
                ? new Menu(
                      this.project,
                      this.source,
                      this.anchor,
                      this.revisions,
                      this.actions,
                      this.organization,
                      this.concepts,
                      [newIndex, undefined],
                      this.action,
                      this.live,
                  )
                : this;
        } else if (submenu instanceof RevisionSet) {
            // Stops at the first item: `-1` once meant "back", but no element
            // was rendered for it, so focus and the active descendant pointed
            // at nothing. Left and Escape leave a submenu.
            const newSubindex = subindex + direction;
            return newSubindex >= 0 && newSubindex < submenu.size()
                ? new Menu(
                      this.project,
                      this.source,
                      this.anchor,
                      this.revisions,
                      this.actions,
                      this.organization,
                      this.concepts,
                      [index, newSubindex],
                      this.action,
                      this.live,
                  )
                : this;
        } else return this;
    }

    /** The first item of the current list. */
    toStart() {
        return this.withSelection(
            this.inSubmenu() ? [this.selection[0], 0] : [0, undefined],
        );
    }

    /** The last item of the current list. */
    toEnd() {
        const list = this.getRevisionList();
        return this.withSelection(
            this.inSubmenu()
                ? [this.selection[0], list.length - 1]
                : [list.length - 1, undefined],
        );
    }

    /** If in a submenu, change selection to be out of it. */
    out() {
        return this.selection[1] !== undefined
            ? new Menu(
                  this.project,
                  this.source,
                  this.anchor,
                  this.revisions,
                  this.actions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.action,
                  this.live,
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
                  this.actions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], 0],
                  this.action,
                  this.live,
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
                  this.actions,
                  this.organization,
                  this.concepts,
                  [this.selection[0], undefined],
                  this.action,
                  this.live,
              )
            : this;
    }

    doEdit(
        locales: Locales,
        revision: Revision | RevisionSet | MenuAction | undefined,
    ) {
        if (revision === undefined) return this.action(undefined);
        // An action runs here rather than travelling through `action`, which
        // exists to apply an edit and has nothing to do with this.
        if (revision instanceof MenuAction) {
            revision.execute();
            return true;
        }
        return revision instanceof Revision
            ? this.action(revision.getEdit(locales), revision)
            : this.action(revision);
    }
}

export class RevisionSet {
    readonly purpose: PurposeType;
    readonly revisions: Revision[];
    /** What names this set, when its purpose doesn't. Several sets can share a purpose — every
     *  unit is Purpose.Numbers — and then the purpose's header would label them all the same. */
    readonly label: ((locale: LocaleText) => string) | undefined;

    constructor(
        purpose: PurposeType,
        revisions: Revision[],
        label?: (locale: LocaleText) => string,
    ) {
        this.purpose = purpose;
        this.revisions = revisions;
        this.label = label;
    }

    /** The text at the top of this set, whether it's named by its group or by its purpose. */
    getHeader(locale: LocaleText): string {
        return (
            this.label?.(locale) ?? locale.ui.docs.purposes[this.purpose].header
        );
    }

    size() {
        return this.revisions.length;
    }
}
