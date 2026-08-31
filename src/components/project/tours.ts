import type { LocaleTextAccessor } from '@locale/Locales';

/**
 * What each tour of the project view's interface is called. Naming them here
 * rather than in ProjectView is what lets anything else refer to one: the
 * tutorial points at them with `@Tour/<id>` markup, and `ConceptLink`
 * validates that a reference names a real one.
 *
 * The steps themselves are in `tourSteps.ts`, which only the project view
 * imports. Every page reaches markup, and so reaches this module; none of them
 * but the project view can run a tour, so none of them should carry what the
 * tours actually say. This module also has no runtime imports at all, so that
 * `ConceptLink` can validate a reference without the parser reaching into
 * components.
 */
export const TourIDs = [
    'stage',
    'source',
    'docs',
    'palette',
    'collaborate',
    'project',
] as const;

export type TourID = (typeof TourIDs)[number];

/** Whether a string names a tour. */
export function isTourID(id: string): id is TourID {
    return (TourIDs as readonly string[]).includes(id);
}

export type TourName = {
    /** Locale path for the subheader naming this tour. */
    subheader: LocaleTextAccessor;
    /** The tour's own invitation ("take a tour of the editor"), which is both
     * the tip on the ⓘ button that opens it and the label wherever a
     * `@Tour/<id>` reference offers it. It names the tile the way the tutorial
     * does, which the tile label doesn't always (the source tile's label is
     * "source"; a learner has been taught the word "editor"). */
    launch: LocaleTextAccessor;
};

export const Tours: Record<TourID, TourName> = {
    stage: {
        subheader: (l) => l.ui.tile.label.output,
        launch: (l) => l.ui.output.tour.launch,
    },
    source: {
        subheader: (l) => l.ui.tile.label.source,
        launch: (l) => l.ui.source.tour.launch,
    },
    docs: {
        subheader: (l) => l.ui.tile.label.docs,
        launch: (l) => l.ui.docs.tour.launch,
    },
    palette: {
        subheader: (l) => l.ui.tile.label.palette,
        launch: (l) => l.ui.palette.tour.launch,
    },
    collaborate: {
        subheader: (l) => l.ui.tile.label.collaborate,
        launch: (l) => l.ui.collaborate.tour.launch,
    },
    project: {
        subheader: (l) => l.ui.project.label,
        launch: (l) => l.ui.project.tour.launch,
    },
};
