import type { ActiveHint } from '@components/widgets/Hint.svelte';
import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import type Conflict from '@conflicts/Conflict';
import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import type { CaretPosition } from '@edit/caret/Caret';
import type { AssignmentPoint, InsertionPoint } from '@edit/drag/Drag';
import type Locale from '@locale/Locale';
import type { LocaleTextAccessor } from '@locale/Locales';
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
import type LanguageCode from '../../locale/LanguageCode';
import type {
    CommandContext,
    Edit,
    ProjectRevision,
} from '../editor/commands/Commands';
import type { Highlights } from '../editor/highlights/Highlights';
import type SelectedOutput from './SelectedOutput.svelte';

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
    createContext<Writable<AnnouncerContext>>();

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

export enum IdleKind {
    /** Indicates no keyboard activity. */
    Idle = 'idle',
    /** Indicates active typing (generally a flurry of insertion or deletion) */
    Typing = 'typing',
    /** Indicates a single command that will not come in a flurry  */
    Typed = 'typed',
}

/** The current keyboard edit idle state in a ProjectView. */
export const [getKeyboardEditIdle, setKeyboardEditIdle] =
    createContext<Writable<IdleKind>>();

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
    createContext<Writable<Set<Node>>>();

/** Various components outside the editor use this to apply edits */

/** In a ProjectView, all of the editor states for each source file. */
export type EditHandler = (
    edit: Edit | ProjectRevision | LocaleTextAccessor,
    idle: IdleKind,
    focus: boolean,
) => Promise<void>;
export type EditorState = {
    caret: Caret;
    project: Project;
    edit: EditHandler;
    focused: boolean;
    blocks: boolean;
    toggleMenu: () => void;
    grabFocus: (message: string) => void;
    setCaretPosition: (position: CaretPosition) => void;
};
export const [getEditors, setEditors] =
    createContext<Writable<Map<string, EditorState>>>();

/** The latest conflicts computed for a project. */
export const [getConflicts, setConflicts] = createContext<
    Writable<Conflict[]> | undefined
>();

/** The currently selected output code in the project's editors. */
export const [getSelectedOutput, setSelectedOutput] = createContext<
    SelectedOutput | undefined
>();

// EDITOR-WIDE CONTEXTS

/** The current caret position, if there is one, in an Editor. */
export const [getCaret, setCaret] = createOptionalContext<
    Writable<Caret> | undefined
>();

/** The current editor, inside an Editor view. */
export const [getEditor, setEditor] = createContext<Writable<EditorState>>();

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
}>();

/** White space of the root */
export const [getSpaces, setSpaces] = createOptionalContext<Writable<Spaces>>();

/** Hidden nodes in the root */
export const [getHidden, setHidden] =
    createOptionalContext<Writable<Set<Node>>>();

/** Whether to localize the code */
export const [getLocalize, setLocalize] =
    createOptionalContext<Writable<Locale | null>>();

/** Whether to render line numbers */
export const [getShowLines, setShowLines] = createContext<Writable<boolean>>();

// DOCUMENTATION-WIDE CONTEXTS

/** The current selected path in a docs browser */
export type ConceptPath = Concept[];
export const [getConceptPath, setConceptPath] =
    createContext<Writable<ConceptPath>>();

/** The current index of concepts */
export type ConceptIndexContext = { index: ConceptIndex | undefined };
export const [getConceptIndex, setConceptIndex] = createContext<
    ConceptIndexContext | undefined
>();

/** VALUE VIEW-WIDE CONTEXT */

export const [getInteractive, setInteractive] = createContext<{
    interactive: boolean;
}>();
