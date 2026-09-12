import { getContext, setContext } from 'svelte';

const HeadingLevelSymbol = Symbol('heading-level');

/** The deepest heading HTML has. */
const MaxLevel = 6;

/**
 * What level a {@link Subheader} renders at, so a section nested inside another one is
 * nested in the document outline too.
 *
 * A context rather than a prop because the views that render these headers are shared and
 * several deep — a kit's page stacks every export through `ConceptView`, which reaches
 * `NamesView` and `StructureConceptView`, each of which heads its own section. Threading a
 * level through all of them would touch a dozen components to say one thing; whoever
 * stacks the sections says it once instead.
 *
 * Without it the kit page emitted eight `h2`s for four exports, all siblings of the kit's
 * own heading, and nothing named the exports at all.
 */
export function setHeadingLevel(level: number) {
    setContext(HeadingLevelSymbol, Math.min(level, MaxLevel));
}

/** The level a subheader should use here, defaulting to the `h2` it has always been. */
export function getHeadingLevel(): number {
    return getContext<number | undefined>(HeadingLevelSymbol) ?? 2;
}
