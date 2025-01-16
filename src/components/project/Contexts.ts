import { setContext, getContext } from 'svelte';
import { type Readable, type Writable } from 'svelte/store';
import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { InsertionPoint } from '../../edit/Drag';
import type Caret from '../../edit/Caret';
import type Project from '@db/projects/Project';
import type Node from '@nodes/Node';
import type { Highlights } from '../editor/util/Highlights';
import type Evaluate from '@nodes/Evaluate';
import type Step from '@runtime/Step';
import type { StreamChange } from '@runtime/Evaluator';
import type Conflict from '@conflicts/Conflict';
import type { Path } from '@nodes/Root';
import type Source from '@nodes/Source';
import type { User } from 'firebase/auth';
import type Evaluator from '@runtime/Evaluator';
import type Root from '@nodes/Root';
import type {
    CommandContext,
    Edit,
    ProjectRevision,
} from '../editor/util/Commands';
import type { CaretPosition } from '../../edit/Caret';
import type LanguageCode from '../../locale/LanguageCode';
import type Spaces from '@parser/Spaces';
import type { LocalizedValue } from '@db/settings/LocalizedSetting';
import type Color from '@output/Color';

// Authentication related contexts

const UserSymbol = Symbol('user');
type UserContext = Writable<User | null>;
export function setUser(context: UserContext) {
    setContext(UserSymbol, context);
}
export function getUser(): UserContext {
    return getContext(UserSymbol);
}

// Project related contexts

type ProjectContext = Readable<Project | undefined>;
const ProjectSymbol = Symbol('project');
export function setProject(context: ProjectContext) {
    setContext(ProjectSymbol, context);
}
export function getProject() {
    return getContext<ProjectContext>(ProjectSymbol);
}

export enum IdleKind {
    /** Indicates no keyboard activity. */
    Idle = 'idle',
    /** Indicates active typing (generally a flurry of insertion or deletion) */
    Typing = 'typing',
    /** Indicates a single command that will not come in a flurry  */
    Typed = 'typed',
}

type KeyboardEditIdleContext = Writable<IdleKind>;
const KeyboardEditIdleSymbol = Symbol('idle');
export function setKeyboardEditIdle(context: KeyboardEditIdleContext) {
    setContext(KeyboardEditIdleSymbol, context);
}
export function getKeyboardEditIdle() {
    return getContext<KeyboardEditIdleContext>(KeyboardEditIdleSymbol);
}

export type KeyModifierState = {
    control: boolean;
    alt: boolean;
    shift: boolean;
};
const KeyModfifierSymbol = Symbol('modifiers');
type KeyModifierContext = Writable<KeyModifierState>;
export function setKeyboardModifiers(context: KeyModifierContext) {
    setContext(KeyModfifierSymbol, context);
}
export function getKeyboardModifiers() {
    return getContext<KeyModifierContext | undefined>(KeyModfifierSymbol);
}

type ProjectCommandContext = { context: CommandContext };
const ProjectCommandContextSymbol = Symbol('projectcommand');
export function setProjectCommandContext(context: ProjectCommandContext) {
    setContext(ProjectCommandContextSymbol, context);
}
export function getProjectCommandContext() {
    return getContext<ProjectCommandContext>(ProjectCommandContextSymbol);
}

// Evaluation related contexts

/** A collection of state that changes each time the evaluator updates. */
type EvaluationContext = Writable<{
    evaluator: Evaluator;
    playing: boolean;
    step: Step | undefined;
    stepIndex: number;
    streams: StreamChange[];
}>;
const EvaluationSymbol = Symbol('evaluation');
export function setEvaluation(context: EvaluationContext) {
    setContext(EvaluationSymbol, context);
}
export function getEvaluation(): EvaluationContext {
    return getContext(EvaluationSymbol);
}

const AnimatingNodesSymbol = Symbol('animatingNodes');
type AnimatingNodesContext = Writable<Set<Node>>;
export function setAnimatingNodes(context: AnimatingNodesContext) {
    setContext(AnimatingNodesSymbol, context);
}
export function getAnimatingNodes(): AnimatingNodesContext | undefined {
    return getContext(AnimatingNodesSymbol);
}

// Editor related contexts

type CaretContext = Writable<Caret> | undefined;
const CaretSymbol = Symbol('caret');
export function setCaret(context: CaretContext) {
    setContext(CaretSymbol, context);
}
export function getCaret() {
    return getContext<CaretContext>(CaretSymbol);
}

export type EditHandler = (
    edit: Edit | ProjectRevision | undefined,
    idle: IdleKind,
    focus: boolean,
) => void;

/** Various components outside the editor use this to apply edits */

export type EditorState = {
    caret: Caret;
    project: Project;
    edit: EditHandler;
    focused: boolean;
    blocks: boolean;
    toggleMenu: () => void;
    grabFocus: (message: string) => void;
};

const EditorsSymbol = Symbol('editors');
type EditorsContext = Writable<Map<string, EditorState>>;
export function setEditors(context: EditorsContext) {
    setContext(EditorsSymbol, context);
}
export function getEditors() {
    return getContext<EditorsContext>(EditorsSymbol);
}

type EditorContext = Writable<EditorState>;
const EditorSymbol = Symbol('editor');
export function setEditor(context: EditorContext) {
    setContext(EditorSymbol, context);
}
export function getEditor(): EditorContext | undefined {
    return getContext<EditorContext>(EditorSymbol);
}

const ConflictsSymbol = Symbol('conflicts');
type ConflictsContext = Writable<Conflict[]>;
export function setConflicts(context: ConflictsContext) {
    setContext(ConflictsSymbol, context);
}
export function getConflicts(): ConflictsContext | undefined {
    return getContext(ConflictsSymbol);
}

type HoveredContext = Writable<Node | undefined> | undefined;
const HoveredSymbol = Symbol('hovered');
export function setHovered(context: HoveredContext) {
    setContext(HoveredSymbol, context);
}
export function getHovered() {
    return getContext<HoveredContext>(HoveredSymbol);
}

type InsertionPointContext = Writable<InsertionPoint | undefined> | undefined;
const InsertionPointsSymbol = Symbol('insertions');
export function setInsertionPoint(context: InsertionPointContext) {
    setContext(InsertionPointsSymbol, context);
}
export function getInsertionPoint() {
    return getContext<InsertionPointContext>(InsertionPointsSymbol);
}

type DraggedContext = Writable<Node | undefined>;
const DraggedSymbol = Symbol('dragged');
export function setDragged(context: DraggedContext) {
    setContext(DraggedSymbol, context);
}
export function getDragged() {
    return getContext<DraggedContext | undefined>(DraggedSymbol);
}

type HighlightContext = Writable<Highlights> | undefined;
const HighlightSymbol = Symbol('highlight');
export function setHighlights(context: HighlightContext) {
    setContext(HighlightSymbol, context);
}
export function getHighlights() {
    return getContext<HighlightContext>(HighlightSymbol);
}

const SpacesSymbol = Symbol('space');
type SpacesContext = Writable<Spaces>;
export function setSpaces(context: SpacesContext) {
    setContext(SpacesSymbol, context);
}
export function getSpaces() {
    return getContext<SpacesContext>(SpacesSymbol);
}

const HiddenSymbol = Symbol('hidden');
type HiddenContext = Writable<Set<Node>>;
export function setHidden(context: HiddenContext) {
    setContext(HiddenSymbol, context);
}
export function getHidden() {
    return getContext<HiddenContext | undefined>(HiddenSymbol);
}

const LocalizeSymbol = Symbol('localize');
type LocalizeContext = Writable<LocalizedValue>;
export function setLocalize(context: LocalizeContext) {
    setContext(LocalizeSymbol, context);
}
export function getLocalize() {
    return getContext<LocalizeContext>(LocalizeSymbol);
}

const ConceptPathSymbol = Symbol('palette-path');
type ConceptPathContext = Writable<Concept[]>;
export function setConceptPath(context: ConceptPathContext) {
    setContext(ConceptPathSymbol, context);
}
export function getConceptPath() {
    return getContext<ConceptPathContext>(ConceptPathSymbol);
}

const ConceptIndexSymbol = Symbol('palette-index');
export type ConceptIndexContext = { index: ConceptIndex | undefined };
export function setConceptIndex(context: ConceptIndexContext) {
    setContext(ConceptIndexSymbol, context);
}
export function getConceptIndex(): ConceptIndexContext | undefined {
    return getContext<ConceptIndexContext>(ConceptIndexSymbol);
}

const RootSymbol = Symbol('root');
type RootContext = { root: Root | undefined };
export function setRoot(context: RootContext) {
    setContext(RootSymbol, context);
}
export function getRoot() {
    return getContext<RootContext>(RootSymbol);
}

const MenuNodeSymbol = Symbol('menu');
type MenuNodeContext = Writable<(position: CaretPosition | undefined) => void>;
export function setSetMenuNode(context: MenuNodeContext) {
    setContext(MenuNodeSymbol, context);
}
export function getSetMenuNode() {
    return getContext<MenuNodeContext>(MenuNodeSymbol);
}

const ShowLinesSymbol = Symbol('lines');
type ShowLinesContext = Writable<boolean>;
export function setShowLines(context: ShowLinesContext) {
    setContext(ShowLinesSymbol, context);
}
export function getShowLines() {
    return getContext<ShowLinesContext>(ShowLinesSymbol);
}

const BlocksSymbol = Symbol('blocks');
type BlocksContext = Writable<boolean>;
export function setIsBlocks(context: BlocksContext) {
    setContext(BlocksSymbol, context);
}
export function getIsBlocks() {
    return getContext<BlocksContext>(BlocksSymbol);
}

// Output related contexts
export type SelectedOutputPaths = {
    source: Source | undefined;
    path: Path | undefined;
}[];

export type SelectedPhrase = {
    name: string;
    index: number | null;
} | null;

export type SelectedOutputContext = {
    selectedPaths: SelectedOutputPaths;
    selectedOutput: Evaluate[];
    selectedPhrase: SelectedPhrase;
    setSelectedOutput: (project: Project, evaluates: Evaluate[]) => void;
    setSelectedPhrase: (phrase: SelectedPhrase) => void;
};

const SelectedOutputSymbol = Symbol('selected-output');

export function setSelectedOutputContext(context: SelectedOutputContext) {
    setContext(SelectedOutputSymbol, context);
}
export function getSelectedOutput(): SelectedOutputContext | undefined {
    return getContext(SelectedOutputSymbol);
}

// Accessibility contexts

// These are lists of announcements rendered invisiblily in the project view
// for screen readers. Children can override by ID to change what's announced.
// This minimizes the number of live regions on the page, increasing the likelihood
// that they're read.
const AnnouncerSymbol = Symbol('announcer');
export type AnnouncerContext = (
    id: string,
    language: LanguageCode | undefined,
    message: string,
) => void;
export function setAnnouncer(context: Writable<AnnouncerContext | undefined>) {
    setContext(AnnouncerSymbol, context);
}
export function getAnnounce(): Writable<AnnouncerContext | undefined> {
    return getContext(AnnouncerSymbol);
}

// Presentation contexts
const FullscreenSymbol = Symbol('fullscreen');
export type FullscreenContext = Writable<{
    on: boolean;
    background: Color | string | null;
}>;
export function setFullscreen(context: FullscreenContext) {
    setContext(FullscreenSymbol, context);
}
export function getFullscreen() {
    return getContext<FullscreenContext>(FullscreenSymbol);
}

const InteractiveSymbol = Symbol('interactive');
type InteractiveContext = { interactive: boolean };
export function setInteractive(context: InteractiveContext) {
    setContext(InteractiveSymbol, context);
}
export function getInteractive() {
    return getContext<InteractiveContext>(InteractiveSymbol);
}
