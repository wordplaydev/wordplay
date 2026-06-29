import type { ActiveHint } from '@components/widgets/Hint.svelte';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { GuideHistory } from '@components/concepts/GuideHistory';
import type Conflict from '@conflicts/Conflict';
import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import type { CaretPosition } from '@edit/caret/Caret';
import type { AssignmentPoint, InsertionPoint } from '@edit/drag/Drag';
import type Locale from '@locale/Locale';
import type { LocaleTextAccessor, LocaleTextsAccessor } from '@locale/Locales';
import type Node from '@nodes/Node';
import type { FieldPosition } from '@nodes/Node';
import type Root from '@nodes/Root';
import type Color from '@output/Color';
import type Spaces from '@parser/Spaces';
import type Evaluator from '@runtime/Evaluator';
import type { StreamChange } from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type { User } from 'firebase/auth';
import { createContext, getContext, setContext } from 'svelte';
import { type Writable } from 'svelte/store';
import type LanguageCode from '@locale/LanguageCode';
import type {
    CommandContext,
    Edit,
    ProjectRevision,
} from '@components/editor/commands/Commands';
import type { Highlights } from '@components/editor/highlights/Highlights';
import type SelectedOutput from '@components/project/SelectedOutput.svelte';

/** A helper for creating an optional context. Svelte's createContext throws if the context is not set. */
function createOptionalContext<T>(): [() => T | undefined, (value: T) => void] {
    const contextSymbol = Symbol();
    function get() {
        return getContext<T | undefined>(contextSymbol);
    }
    function set(value: T) {
        setContext<T>(contextSymbol, value);
    }
    return [get, set];
}

// SITE-WIDE CONTEXTS

// Authentication related contexts

type PossibleUser = User | null | undefined;

/** The current authenticated user. All routes. */
export const [getUser, setUser] = createContext<Writable<PossibleUser>>();

export function isAuthenticated(user: PossibleUser): user is User {
    return user !== null && user !== undefined;
}

// Localization context

export const [getLocalizing, setLocalizing] = createContext<{
    on: boolean;
    focused: LocaleTextsAccessor | undefined;
}>();

/** Communication channel from a `<Link>` to a `<LocalizedText>` rendered inside
 *  it. The child registers its locale path here; the parent uses that path to
 *  render an edit affordance *beside* the anchor instead of inside it. Putting
 *  a button inside an anchor is invalid HTML and blocks navigation — this lets
 *  the link stay a plain hyperlink while still being editable in localize mode. */
export type LinkLocalizeContext = {
    register: (path: LocaleTextAccessor | undefined) => void;
};
export const [getLinkLocalize, setLinkLocalize] =
    createOptionalContext<LinkLocalizeContext>();

/**
 * These are lists of announcements rendered invisiblily in the project view
 * for screen readers. Children can override by ID to change what's announced.
 * This minimizes the number of live regions on the page, increasing the likelihood that they're read.
 */
export type AnnouncerContext =
    | ((
          id: string,
          language: LanguageCode | undefined,
          message: string,
      ) => void)
    | undefined;
export const [getAnnouncer, setAnnouncer] =
    createOptionalContext<Writable<AnnouncerContext>>();

/** Whether the site is in fullscreen mode. */
export type FullscreenContext = Writable<{
    on: boolean;
    background: Color | string | null;
}>;
export const [getFullscreen, setFullscreen] =
    createContext<FullscreenContext>();

/** The current tooltip shown for a widget */
export const [getTip, setTip] = createContext<ActiveHint>();

// PROJECT-WIDE CONTEXTS

/** The current project being viewed or edited. Project, tutorial, and example code routes. Optionally set. */
export const [getProject, setProject] =
    createOptionalContext<Writable<Project | undefined>>();

export const IdleKind = {
    /** Indicates no keyboard activity. */
    Idle: 'idle',
    /** Indicates active typing (generally a flurry of insertion or deletion) */
    Typing: 'typing',
    /** Indicates a single command that will not come in a flurry  */
    Typed: 'typed',
} as const;
export type IdleKind = (typeof IdleKind)[keyof typeof IdleKind];

/** The current keyboard edit idle state in a ProjectView. */
export const [getKeyboardEditIdle, setKeyboardEditIdle] =
    createOptionalContext<Writable<IdleKind>>();

/**
 * A function that resets the keyboard idle timer without writing to the
 * keyboardEditIdle store. Editors call this on every keystroke (so the
 * 1s idle timeout debounces correctly) while leaving the store alone when
 * the idle state hasn't transitioned — that prevents a fanout of
 * idempotent subscriber re-runs across every typed character.
 */
export const [getResetKeyboardIdle, setResetKeyboardIdle] =
    createOptionalContext<() => void>();

export type KeyModifierState = {
    control: boolean;
    alt: boolean;
    shift: boolean;
};

/** The latest state of keyboard modifiers in a ProjectView. */
export const [getKeyboardModifiers, setKeyboardModifiers] =
    createContext<Writable<KeyModifierState>>();

export const [getProjectCommandContext, setProjectCommandContext] =
    createContext<{ context: CommandContext }>();

/** A collection of state that changes each time the evaluator updates. */
export const [getEvaluation, setEvaluation] = createOptionalContext<
    Writable<{
        evaluator: Evaluator;
        playing: boolean;
        step: Step | undefined;
        stepIndex: number;
        streams: StreamChange[];
    }>
>();

/** The set of nodes that are animating at runtime */
export const [getAnimatingNodes, setAnimatingNodes] =
    createOptionalContext<Writable<Set<Node>>>();

/** Various components outside the editor use this to apply edits */

/** In a ProjectView, all of the editor states for each source file. */
export type EditHandler = (
    edit: Edit | ProjectRevision | LocaleTextAccessor,
    idle: IdleKind,
    focus: boolean,
) => Promise<void>;
export type EditorState = {
    caret: Caret;
    /** A snapshot of the caret that lags the live one and only catches up on
     * idle or discrete (non-repeat) input events. Use this when driving UI
     * that should remain stable during rapid input flurries. */
    displayedCaret: Caret;
    sourceID: string;
    project: Project;
    edit: EditHandler;
    focused: boolean;
    blocks: boolean;
    toggleMenu: () => void;
    grabFocus: (message: string) => void;
    setCaretPosition: (position: CaretPosition) => void;
    /** Invalidate the editor's cached highlight measurements and remeasure.
     * Call after a descendant changes its rendered shape (e.g. an elided
     * sequence expanded/collapsed) so selection outlines don't go stale. */
    refreshHighlights: () => void;
    /** Fold every foldable node in the source. */
    foldAll: () => void;
    /** Unfold everything in the source. */
    unfoldAll: () => void;
    /** Whether anything is currently unfolded (so "fold all" would do something). */
    canFoldAll: () => boolean;
    /** Whether anything is currently folded (so "unfold all" would do something). */
    canUnfoldAll: () => boolean;
    zoom: number;
    setZoom: (z: number) => void;
};
export const [getEditors, setEditors] =
    createOptionalContext<Writable<Map<string, EditorState>>>();

/**
 * The conflict currently being emphasized, shared between the editor and the
 * Annotations sidebar to drive the two-way "draw attention" link. Each side
 * only reacts to the *other* side's origin, preventing feedback loops:
 * - `origin: 'sidebar'` → the editor scrolls to + wiggles the conflict's underline.
 * - `origin: 'editor'`  → the sidebar scrolls to + wiggles the conflict's row.
 * `nonce` is bumped on every emphasis so consumers can re-fire even when the
 * emphasized node is unchanged.
 */
export type EmphasizedConflict = {
    node: Node;
    origin: 'editor' | 'sidebar';
    nonce: number;
};
export const [getEmphasizedConflict, setEmphasizedConflict] =
    createOptionalContext<Writable<EmphasizedConflict | undefined>>();

/** The latest conflicts computed for a project. */
export const [getConflicts, setConflicts] = createOptionalContext<
    Writable<Conflict[]> | undefined
>();

/** The currently selected output code in the project's editors. */
export const [getSelectedOutput, setSelectedOutput] = createOptionalContext<
    SelectedOutput | undefined
>();

/** Reveal the palette tile. Changing the output selection no longer auto-shows the palette
 *  (that was jarring on drag/stage-select); showing it is now an explicit gesture. A stage
 *  output invokes this on double-click or Enter to open the palette for the selected content. */
export const [getRevealPalette, setRevealPalette] =
    createOptionalContext<() => void>();

// EDITOR-WIDE CONTEXTS

/** The current caret position, if there is one, in an Editor. */
export const [getCaret, setCaret] = createOptionalContext<
    Writable<Caret> | undefined
>();

/** The current editor, inside an Editor view. Optional because RootView is
 * also rendered outside any Editor (e.g. inside menu items, docs previews),
 * where descendants like NodeSequenceView still call getEditor(). */
export const [getEditor, setEditor] =
    createOptionalContext<Writable<EditorState>>();

/** The current drag target being rendered. */
export const [getDragTarget, setDragTarget] = createOptionalContext<
    Writable<InsertionPoint | AssignmentPoint | undefined> | undefined
>();

/** The current node being dragged */
export const [getDragged, setDragged] =
    createOptionalContext<Writable<Node | undefined>>();

/** Node highlights to render in an editor */
export const [getHighlights, setHighlights] =
    createOptionalContext<Writable<Highlights>>();

export const [getSetMenuAnchor, setSetMenuAnchor] =
    createOptionalContext<
        Writable<(position: CaretPosition | FieldPosition) => void>
    >();

// CODE-WIDE CONTEXTS (e.g., in a RootView).

/** The current rode node of a code block */
export const [getRoot, setRoot] = createOptionalContext<{
    root: Root | undefined;
    removed: Set<Node>;
    /** Nodes that should render as a single ellipsis ("…") instead of their
     *  full subtree. Used in menu item previews to elide large unchanged code. */
    elided: Set<Node>;
}>();

/** White space of the root */
export const [getSpaces, setSpaces] = createOptionalContext<Writable<Spaces>>();

/** Hidden nodes in the root */
export const [getHidden, setHidden] =
    createOptionalContext<Writable<Set<Node>>>();

/** Folded nodes in the root: each renders collapsed to a single line with a
 *  trailing "…", instead of its full multi-line subtree (code folding). This is
 *  the persistent set the fold controls toggle. */
export const [getFolded, setFolded] =
    createOptionalContext<Writable<Set<Node>>>();

/** The folded set MINUS nodes that are temporarily force-expanded (because the
 *  debugger stepped into them, a search match or highlight is inside, etc.).
 *  Rendering and the caret use this so those auto-expand and re-fold on their
 *  own; the toggle still reflects the persistent `folded` set. */
export const [getEffectiveFolded, setEffectiveFolded] =
    createOptionalContext<Writable<Set<Node>>>();

/** Whether to localize the code */
export const [getLocalize, setLocalize] =
    createOptionalContext<Writable<Locale | null>>();

/** Whether to render line numbers */
export const [getShowLines, setShowLines] = createContext<Writable<boolean>>();

// DOCUMENTATION-WIDE CONTEXTS

/** The guide's navigation history: a flat stack of visited locations (home is the
 *  empty stack; search results and concepts are pushed on top). See GuideHistory.ts. */
export type ConceptPath = GuideHistory;
const ConceptPathSymbol = Symbol('conceptPath');
/** The guide's navigation path. Required getter — throws if unset; use in the
 *  guide/project/tutorial, where it's always provided. */
export function getConceptPath(): Writable<ConceptPath> {
    const path = getContext<Writable<ConceptPath> | undefined>(
        ConceptPathSymbol,
    );
    if (path === undefined)
        throw new Error('Concept path context was not set in a parent.');
    return path;
}
/** Optional getter — undefined when unset. Use where concept links can render
 *  without a guide context (e.g. inside the global Hint/tooltip or a standalone
 *  page), so a missing path degrades gracefully instead of throwing. */
export function getConceptPathOptional(): Writable<ConceptPath> | undefined {
    return getContext<Writable<ConceptPath> | undefined>(ConceptPathSymbol);
}
export function setConceptPath(path: Writable<ConceptPath>): void {
    setContext(ConceptPathSymbol, path);
}

/** The current index of concepts */
export type ConceptIndexContext = { index: ConceptIndex | undefined };
export const [getConceptIndex, setConceptIndex] = createOptionalContext<
    ConceptIndexContext | undefined
>();

/** VALUE VIEW-WIDE CONTEXT */

export const [getInteractive, setInteractive] = createContext<{
    interactive: boolean;
}>();
