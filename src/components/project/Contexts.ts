import type { TourID } from '@components/project/tours';
import type { ActiveHint } from '@components/widgets/Hint.svelte';
import type { SensorPanelStack } from '@components/output/SensorPanelStack.svelte';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { GuideHistory } from '@components/concepts/GuideHistory';
import type Conflict from '@conflicts/Conflict';
import type { ResolvedReference } from '@db/chats/codeReference';
import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import type { CaretPosition } from '@edit/caret/Caret';
import type { AssignmentPoint, InsertionPoint } from '@edit/drag/Drag';
import type Locale from '@locale/Locale';
import type { LocaleTextAccessor, LocaleTextsAccessor } from '@locale/Locales';
import type Node from '@nodes/Node';
import type { FieldPosition } from '@nodes/Node';
import type Root from '@nodes/Root';
import type Token from '@nodes/Token';
import type Spaces from '@parser/Spaces';
import type { ProjectMode } from '@components/project/ProjectMode';
import type Drawing from '@components/output/Drawing.svelte.ts';
import type { OutputInfoSet } from '@output/animation/Animator';
import type Evaluator from '@runtime/Evaluator';
import type { StreamChange } from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type { User } from 'firebase/auth';
import { createContext, getContext, setContext } from 'svelte';
import { derived, type Readable, type Writable } from 'svelte/store';
import type LanguageCode from '@locale/LanguageCode';
import type { AnnouncementKind } from '@components/project/announcerQueue';
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
 * The app-wide announcement function backed by the single live region in
 * Announcer.svelte. The kind determines the announcement's priority lane —
 * see the registry in announcerQueue.ts; adding a kind means registering it
 * there with a lane. One region for the whole app maximizes the likelihood
 * that screen readers read announcements in order.
 */
export type AnnouncerContext =
    | ((
          kind: AnnouncementKind,
          language: LanguageCode | undefined,
          message: string,
      ) => void)
    | undefined;
export const [getAnnouncer, setAnnouncer] =
    createOptionalContext<Writable<AnnouncerContext>>();

/** Whether the site is in fullscreen mode. Colors arrive already resolved to
 * CSS: Page renders on every route, and importing Color to resolve them there
 * would pull the whole language basis into every page's bundle. */
export type FullscreenContext = Writable<{
    on: boolean;
    background: string | null;
    foreground: string | null;
}>;
export const [getFullscreen, setFullscreen] =
    createContext<FullscreenContext>();

/** The current tooltip shown for a widget */
export const [getTip, setTip] = createContext<ActiveHint>();

/** Coordinator for stacking sensor monitor preview panels */
export const [getSensorPanelStack, setSensorPanelStack] =
    createOptionalContext<SensorPanelStack>();

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
export type EvaluationContext = {
    evaluator: Evaluator;
    playing: boolean;
    step: Step | undefined;
    stepIndex: number;
    streams: StreamChange[];
    /** The project's evaluation mode. Undefined outside a ProjectView (doc examples,
     * previews), where playing alone determines behavior. */
    mode?: ProjectMode;
    /**
     * Which performance the stage is showing. Anything that happens once per run
     * — speaking a `Say`, sounding a one-shot score, playing an entrance —
     * compares this rather than keeping its own memory, which is how those three
     * drifted apart. Undefined outside a ProjectView, where there are no modes to
     * move between and so only ever one performance.
     */
    performance?: number;
};
export const [getEvaluation, setEvaluation] =
    createOptionalContext<Writable<EvaluationContext>>();

/** Whether the stage's measurement grid is on, and so whether moving output
 *  snaps to it (#117). The toggle lives in ProjectView and the grid is drawn by
 *  StageView, but the arrow-key move is owned by the individual output views
 *  several levels below both, which have no other way to see it. */
export const [getStageGrid, setStageGrid] =
    createOptionalContext<Readable<boolean>>();

/**
 * Lays out what is currently on stage, which is where anything moving output
 * finds what else is there to line up with (#117).
 *
 * A function rather than a value because the walk is a full layout pass and a
 * move needs it only when one begins. Created by OutputView and filled in by
 * StageView, which holds the stage and its render context, so the pointer drag
 * (OutputView's) and the arrow keys (each output view's) read the same scene.
 *
 * Deliberately not `Animator.scene`: the animator is SUSPENDED whenever the
 * stage is paused, and paused is the only state output can be edited in, so
 * that scene is empty exactly when this is needed.
 */
export const [getStageScene, setStageScene] =
    createOptionalContext<Writable<(() => OutputInfoSet) | undefined>>();

/**
 * The stage's drawing mode and the stroke in progress (#167).
 *
 * Created by ProjectView, because its three ends are in different tiles: the toggle is in the
 * palette's insert toolbar, the pointer and keyboard gestures are OutputView's, and the preview
 * is drawn by StageView inside the root group, where a metre is PX_PER_METER pixels — the same
 * space the grid and the snap guides are drawn in.
 */
export const [getDrawing, setDrawing] = createOptionalContext<Drawing>();

/** A play-rate-decoupled view of the evaluation context: the same shape, but
 * updated only on step-relevant changes — play/pause flips, steps while paused,
 * and evaluator replacement — NOT on every while-playing broadcast (~60 Hz).
 * The Editor sets this for its subtree so each rendered NodeView's inline-value
 * derived (which shows nothing while playing anyway) isn't re-run per node per
 * frame during play. */
export const [getSteppedEvaluation, setSteppedEvaluation] =
    createOptionalContext<Readable<EvaluationContext>>();

/** Derive a play-rate-decoupled copy of an evaluation store: it forwards every
 * update except consecutive while-playing broadcasts from the same evaluator,
 * which arrive at ~60 Hz and which step-oriented consumers (the editor's inline
 * values, the palette's debug values — both hidden while playing) would re-run
 * their deriveds for, for nothing. Generic over the context shape so tests can
 * exercise the skip rule with plain objects. */
export function deriveSteppedEvaluation<
    T extends { playing: boolean; evaluator: unknown },
>(evaluation: Readable<T>): Readable<T> {
    let previous: T | undefined = undefined;
    return derived(evaluation, (next, set) => {
        if (
            previous === undefined ||
            !(next.playing && previous.playing) ||
            next.evaluator !== previous.evaluator
        )
            set(next);
        previous = next;
    });
}

/** A once-per-caret-change summary of the caret's token relationships, so each
 * rendered TokenView's caret flags (in-caret, active, added) are identity
 * checks instead of re-running the caret's token-resolution walks per token per
 * caret move — the dominant per-keystroke fan-out at 30–40 visible lines. Set
 * by the Editor; absent in non-editor render contexts (previews), where tokens
 * have no caret state. */
export type CaretTokenSummary = {
    /** The token the caret is directly on (excluding space). */
    tokenAt: Token | undefined;
    /** The token the caret trails: tokenPrior when at the start of the
     * following token's space. */
    priorBoundary: Token | undefined;
    /** Whether the prior-boundary token also counts as "active" (the token at
     * the caret has preceding space). */
    priorBoundaryActive: boolean;
    /** The ids of the recently added subtree's nodes, if any. */
    addedIds: Set<number> | undefined;
};
export const [getCaretTokenSummary, setCaretTokenSummary] =
    createOptionalContext<Writable<CaretTokenSummary>>();

/** The set of nodes that are animating at runtime */
export const [getAnimatingNodes, setAnimatingNodes] =
    createOptionalContext<Writable<Set<Node>>>();

/** The set of nodes that determined the notes sounding at runtime */
export const [getSoundingNodes, setSoundingNodes] =
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
    /** Scroll a node into view and center it, scrolling a virtualized (off-window)
     *  statement in first if needed. Used by the Annotations sidebar to reveal a
     *  conflict on click. */
    revealNode: (node: Node) => void;
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

/** The four slots the conversation and the editors use to talk about code
 *  (#820). Slots rather than functions because the halves sit in tiles that
 *  know nothing about each other, and the project view is the only thing
 *  holding both. Why each exists is in codeReference.ts, which is off every
 *  page's import graph — unlike this file, whose prose every page pays for. */

/** The code the message being written is about, or nothing. */
export const [getLinkedNode, setLinkedNode] =
    createOptionalContext<Writable<Node | undefined>>();

/** Which messages are about which code. Keyed by node identity, rebuilt with
 *  the program, so only ever read within a render. */
export const [getReferencedMessages, setReferencedMessages] =
    createOptionalContext<Writable<Map<Node, string[]>>>();

/** Where each message's reference points now, by message id. Published rather
 *  than recomputed: resolving is not free and both readers want one answer. */
export const [getResolvedReferences, setResolvedReferences] =
    createOptionalContext<Writable<Map<string, ResolvedReference>>>();

/** Which lines carry a gutter marker. RootView derives it, because NodeView
 *  renders space runs and can only ask by line number; blocks mode asks
 *  {@link getReferencedMessages} by node, since a block is a node. */
export const [getLineMarkers, setLineMarkers] =
    createOptionalContext<Writable<Map<number, string[]>>>();

/**
 * A request to show one message in the conversation, written by a gutter marker
 * and read by the chat.
 *
 * A slot rather than a callback because the handler is the chat, which is not an
 * ancestor of the editor — a context only flows down from whoever provides it.
 * `nonce` is here for the same reason {@link EmphasizedConflict} has one: going
 * to the same message twice has to scroll twice, and the reader is an effect
 * that re-runs on every change to the conversation, so it must act once per
 * request rather than once per value.
 */
export type MessageRequest = { message: string; nonce: number };
export const [getMessageRequest, setMessageRequest] =
    createOptionalContext<Writable<MessageRequest | undefined>>();

/** Reveal the palette tile. Changing the output selection no longer auto-shows the palette
 *  (that was jarring on drag/stage-select); showing it is now an explicit gesture. A stage
 *  output invokes this on double-click or Enter to open the palette for the selected content. */
export const [getRevealPalette, setRevealPalette] =
    createOptionalContext<() => void>();

/** A slot a `@Tour/<id>` reference writes to, and the project view watches, to
 *  start a tour. It is a slot rather than a launcher function because the thing
 *  that offers a tour is not always inside the view that can run one: the
 *  tutorial's dialog is a sibling of its ProjectView, not a descendant, so the
 *  tutorial sets the slot above both. ProjectView provides its own when nothing
 *  above it has, so a reference inside its guide tile still works. */
export type TourRequest = { id: TourID | undefined };
export const [getTourRequest, setTourRequest] =
    createOptionalContext<TourRequest>();

/** Whether the palette is on screen. Output selection and the chrome that explains it are
 *  features of the palette, so everything that draws or makes a selection consults this.
 *  The palette publishes it from its own mount and unmount rather than from a tile
 *  visibility test, so it can't disagree with the selection it clears on the way out. */
export const [getPaletteOpen, setPaletteOpen] =
    createOptionalContext<Writable<boolean>>();

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

/** Bridge from the Editor to a deep, virtualized statement list
 * (WindowedStatements). The Editor creates this; the windowed component
 * REGISTERS itself into it (it mounts far below, so props can't reach it).
 *
 * - `scrollToNode`: set by WindowedStatements while it's mounted — scrolls its
 *   container so the given node's statement renders, resolving true once the
 *   node's element is in the DOM (false when the node isn't in the windowed list
 *   or nothing is windowed). Off-window nodes have no DOM, so every "scroll to /
 *   highlight a node" path calls this first, then re-resolves the element.
 * - `revision`: bumped by WindowedStatements whenever its visible set changes, so
 *   the Editor's outline/search-outline/node-view-cache effects re-run and
 *   (re)measure highlights for statements that just scrolled into view. */
export type WindowingBridge = {
    scrollToNode: Writable<((node: Node) => Promise<boolean>) | undefined>;
    revision: Writable<number>;
};
export const [getWindowing, setWindowing] =
    createOptionalContext<WindowingBridge>();

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

/**
 * Whether a code view may wrap its lines.
 *
 * The editor renders every space as a non-breaking one, so a line holds its
 * shape while it is edited and the caret's column never depends on where the
 * box happens to end. A read-only view has no caret and no edits, and on a
 * narrow column a line that cannot break just leaves the page. This lets such a
 * view ask for ordinary spaces instead. Optional and off by default: only a
 * view that knows it is inert should turn it on.
 */
export const [getWrapping, setWrapping] = createOptionalContext<boolean>();

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

/**
 * Whether examples rendered here offer to open as an editable scratch project
 * (#1044). Set by the guide, so the button appears on documentation and how-to
 * examples but not on the ones embedded in authoring forms or tutorial
 * dialogue, where a second copy of the code would be a distraction.
 */
const TinkerableSymbol = Symbol('tinkerable');
export function getTinkerable(): boolean {
    return getContext<boolean | undefined>(TinkerableSymbol) ?? false;
}
export function setTinkerable(tinkerable: boolean): void {
    setContext(TinkerableSymbol, tinkerable);
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
