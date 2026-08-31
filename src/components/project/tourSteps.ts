import type { LocaleTextsAccessor } from '@locale/Locales';
import type { TourID } from '@components/project/tours';

/**
 * What each tour actually says, step by step. Separate from `tours.ts` because
 * every page reaches that one through markup, while only the project view can
 * run a tour — so only it should carry these.
 */

/** A pair identifying a UI element by its `data-uiid` and the localized
 * markup that explains it. A Tour walks through a sequence of these. */
export type UIExplanation = {
    uiid: string;
    explanation: LocaleTextsAccessor;
    /** Optional side-effect run when this step becomes active. Use to
     * change UI state so the next highlighted control is visible —
     * e.g., switching a tab in the Guide so the relevant section is
     * showing before its target is located. */
    onEnter?: () => void;
};

/** Programmatically click the docs section tab for the given index
 * (0 = code/language, 1 = how-to). Tabbed listens to `pointerdown`, so a
 * synthesized event is what actually triggers selection. */
function setDocsMode(index: number) {
    const buttons = document.querySelectorAll<HTMLButtonElement>(
        '[data-uiid="docsModeToggle"] button',
    );
    const target = buttons[index];
    if (target && target.getAttribute('aria-selected') !== 'true')
        target.dispatchEvent(
            new PointerEvent('pointerdown', {
                bubbles: true,
                button: 0,
                pointerType: 'mouse',
            }),
        );
}

export const TourSteps: Record<TourID, UIExplanation[]> = {
    stage: [
        { uiid: 'stage', explanation: (l) => l.ui.output.tour.stage },
        {
            uiid: 'modeSwitcher',
            explanation: (l) => l.ui.timeline.tour.modes,
        },
        {
            uiid: 'resetEvaluator',
            explanation: (l) => l.ui.output.tour.reset,
        },
        // The stepping controls appear in edit and debug but not play; the Tour
        // explains when a target isn't visible, so these steps still read
        // sensibly there.
        {
            uiid: 'timeline',
            explanation: (l) => l.ui.timeline.tour.timeline,
        },
        {
            uiid: 'timeline',
            explanation: (l) => l.ui.timeline.tour.history,
        },
        {
            uiid: 'stepControls',
            explanation: (l) => l.ui.timeline.tour.stepControls,
        },
        {
            uiid: 'conflict',
            explanation: (l) => l.ui.timeline.tour.annotations,
        },
        { uiid: 'editor', explanation: (l) => l.ui.timeline.tour.editor },
        { uiid: 'stageZoom', explanation: (l) => l.ui.output.tour.zoom },
        { uiid: 'stageGrid', explanation: (l) => l.ui.output.tour.grid },
        { uiid: 'stageLock', explanation: (l) => l.ui.output.tour.lock },
        {
            uiid: 'stageAnimationSpeed',
            explanation: (l) => l.ui.output.tour.animationSpeed,
        },
    ],
    source: [
        { uiid: 'editor', explanation: (l) => l.ui.source.tour.editor },
        {
            uiid: 'textBlocksToggle',
            explanation: (l) => l.ui.source.tour.textBlocks,
        },
        {
            uiid: 'editorToolbar',
            explanation: (l) => l.ui.source.tour.toolbar,
        },
        // The hamburger that reveals the toolbar's overflow. It only exists
        // when something actually overflows, which the Tour reports.
        {
            uiid: 'editorExpand',
            explanation: (l) => l.ui.source.tour.expand,
        },
        {
            uiid: 'shortcutsDialog',
            explanation: (l) => l.ui.source.tour.shortcuts,
        },
    ],
    docs: [
        { uiid: 'documentation', explanation: (l) => l.ui.docs.tour.guide },
        {
            uiid: 'documentation',
            explanation: (l) => l.ui.docs.tour.code,
            onEnter: () => setDocsMode(0),
        },
        {
            uiid: 'documentation',
            explanation: (l) => l.ui.docs.tour.howto,
            onEnter: () => setDocsMode(1),
        },
        { uiid: 'docsModeToggle', explanation: (l) => l.ui.docs.tour.mode },
        { uiid: 'docsSearch', explanation: (l) => l.ui.docs.tour.search },
    ],
    palette: [
        { uiid: 'palette', explanation: (l) => l.ui.palette.tour.palette },
        { uiid: 'paletteText', explanation: (l) => l.ui.palette.tour.text },
        { uiid: 'paletteSet', explanation: (l) => l.ui.palette.tour.set },
        {
            uiid: 'paletteUnset',
            explanation: (l) => l.ui.palette.tour.unset,
        },
        { uiid: 'editor', explanation: (l) => l.ui.palette.tour.editor },
        { uiid: 'stage', explanation: (l) => l.ui.palette.tour.stage },
    ],
    collaborate: [
        {
            uiid: 'collaborate',
            explanation: (l) => l.ui.collaborate.tour.collaborate,
        },
        {
            uiid: 'collaborators',
            explanation: (l) => l.ui.collaborate.tour.collaborators,
        },
        {
            uiid: 'addCollaborator',
            explanation: (l) => l.ui.collaborate.tour.add,
        },
        {
            uiid: 'restrictGallery',
            explanation: (l) => l.ui.collaborate.tour.restrict,
        },
    ],
    project: [
        {
            uiid: 'projectControls',
            explanation: (l) => l.ui.project.tour.controls,
        },
        {
            uiid: 'projectName',
            explanation: (l) => l.ui.project.tour.name,
        },
        {
            uiid: 'sourceToggle',
            explanation: (l) => l.ui.project.tour.sourceToggle,
        },
        {
            uiid: 'addSource',
            explanation: (l) => l.ui.project.tour.addSource,
        },
        {
            uiid: 'shareDialog',
            explanation: (l) => l.ui.project.tour.share,
        },
        {
            uiid: 'languagesButton',
            explanation: (l) => l.ui.project.tour.languages,
        },
        {
            uiid: 'checkpoints',
            explanation: (l) => l.ui.project.tour.checkpoints,
        },
    ],
};
