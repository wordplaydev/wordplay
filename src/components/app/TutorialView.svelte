<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import { goto } from '$app/navigation';
    import {
        ConceptIndexSymbol,
        getUser,
        type ConceptIndexContext,
        ConceptPathSymbol,
    } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';
    import Button from '../widgets/Button.svelte';
    import Source from '../../nodes/Source';
    import type Lesson from '../../tutorial/Lesson';
    import type { FixedArray } from '../../locale/Locale';
    import { creator, projects } from '../../db/Creator';
    import type Doc from '../../nodes/Doc';
    import type Spaces from '../../parser/Spaces';
    import { parseDoc, toTokens } from '../../parser/Parser';
    import DocHtmlView from '../concepts/DocHTMLView.svelte';
    import { setContext } from 'svelte';
    import type ConceptIndex from '../../concepts/ConceptIndex';
    import { writable } from 'svelte/store';
    import { tick } from 'svelte';

    export let progress: Progress;
    export let navigate: (progress: Progress) => void;

    // Get the concept index and path from the project view and put it in
    // a store, and the store in a context so that ContextViewUI can access the index.
    let concepts: ConceptIndexContext | undefined = undefined;
    let conceptsStore = writable<ConceptIndex | undefined>(undefined);
    $: conceptsStore.set($concepts);
    setContext(ConceptIndexSymbol, conceptsStore);

    // Create a concept path for children
    setContext(ConceptPathSymbol, writable([]));

    const user = getUser();

    let view: HTMLElement | undefined;

    function getName(lesson: Lesson) {
        return typeof lesson.concept.names === 'string'
            ? lesson.concept.names
            : lesson.concept.names[0];
    }

    const placeholderRegEx = new RegExp('^\\$[0-9]+');

    /** Given some text, replace all $[0-9]+ with the text in the texts array corresponding to the index indicated. */
    function localize(text: string, texts: FixedArray<any, string>) {
        let localized = '';
        let remaining = text;
        while (remaining.length > 0) {
            if (placeholderRegEx.test(remaining)) {
                remaining = remaining.substring(1);
                let numberText = '';
                while (isFinite(parseInt(remaining.charAt(0)))) {
                    numberText = numberText + remaining.charAt(0);
                    remaining = remaining.substring(1);
                }
                let number = parseInt(numberText);
                if (isFinite(number) && texts[number - 1] !== undefined) {
                    localized += texts[number - 1];
                }
                // Otherwise fail.
                else {
                    return text;
                }
            } else {
                localized = localized + remaining.charAt(0);
                remaining = remaining.substring(1);
            }
        }

        return localized;
    }

    /** The current place in the tutorial */
    $: unit = progress.getUnit();
    $: lesson = progress.getLesson();
    $: names = lesson ? getName(lesson) : '–';
    $: step = progress.getStep();
    $: instructions = lesson?.concept.tutorial.dialog[progress.step];
    $: overview =
        lesson === undefined && unit
            ? $creator.getLocale().tutorial.units[unit.id].overview
            : undefined;
    $: overviewStep = overview ? overview[progress.step] : undefined;
    // Get the corresponding concept so we can find it's glyphs.
    $: concept =
        $conceptsStore && lesson
            ? $conceptsStore.getConceptByName(
                  typeof lesson.concept.names === 'string'
                      ? lesson.concept.names
                      : lesson.concept.names[0]
              )
            : undefined;

    /** Convert the instructions into a sequence of docs/space pairs */
    let turns: { speech: Doc; spaces: Spaces }[] = [];
    $: {
        const text =
            instructions !== undefined && lesson !== undefined
                ? localize(instructions[1], lesson.concept.tutorial.text)
                : overviewStep
                ? overviewStep[1]
                : '';
        // Localize all of the text using the lesson's names
        // Split by speaker
        const statements = text.split('---');
        // Map each speaker onto a docs
        turns = statements.map((statement) => {
            const tokens = toTokens('`' + statement + '`');
            return { speech: parseDoc(tokens), spaces: tokens.getSpaces() };
        });
    }

    $: project = unit
        ? new Project(
              progress.getProjectID(),
              lesson ? names : unit.id,
              new Source(
                  'main',
                  localize(
                      step ? step.sources[0] : unit.sources[0],
                      lesson ? lesson.concept.tutorial.text : []
                  )
              ),
              unit.sources
                  .slice(1)
                  .map(
                      (source, index) =>
                          new Source(
                              `${index}`,
                              lesson
                                  ? localize(
                                        source,
                                        lesson.concept.tutorial.text
                                    )
                                  : source
                          )
                  ),
              undefined,
              $user ? [$user.uid] : [],
              false
          )
        : undefined;

    // Any time the project changes, add/update it in projects.
    // This persists the project state for later.
    $: {
        if (project) {
            const existing = $projects.getProject(project.id);
            if (existing === undefined || !existing.equals(project))
                $creator.addProject(project);
        }
    }

    // Any time the project database changes for the current ID, update the project
    $: {
        if ($creator) {
            const proj = $projects.getProject(progress.getProjectID());
            if (proj) project = proj;
        }
    }

    let selection: Progress | undefined = undefined;
    function handleSelect() {
        if (selection) navigate(selection);
    }

    async function handleKey(event: KeyboardEvent) {
        if (event.key.startsWith('Arrow')) {
            if (event.key === 'ArrowLeft')
                navigate(progress.previousStep() ?? progress);
            else if (event.key == 'ArrowRight')
                navigate(progress.nextStep() ?? progress);

            await tick();
            if (view) view.focus();
        }
    }
</script>

<section class="tutorial">
    <div
        class="instructions"
        tabIndex="0"
        on:keydown={handleKey}
        bind:this={view}
    >
        <nav>
            <Button
                tip={$creator.getLocale().ui.tooltip.previousLesson}
                action={() => navigate(progress.previousLesson() ?? progress)}
                enabled={progress.previousLesson() !== undefined}>←</Button
            >
            <!-- A hierarchical select of tutorial units and lessons  -->
            <select bind:value={selection} on:change={handleSelect}>
                {#each progress.tutorial as unit}
                    <optgroup
                        label={$creator.getLocale().tutorial.units[unit.id]
                            .name}
                    >
                        <option
                            value={new Progress(
                                $creator.getLocale().tutorial.units,
                                progress.tutorial,
                                unit.id,
                                0,
                                0
                            )}>◆</option
                        >
                        {#each unit.lessons as lesson, index}
                            <option
                                value={new Progress(
                                    $creator.getLocale().tutorial.units,
                                    progress.tutorial,
                                    unit.id,
                                    index + 1,
                                    0
                                )}>{getName(lesson)}</option
                            >
                        {/each}
                    </optgroup>
                {/each}
            </select>
            <Note
                >{unit
                    ? $creator.getLocale().tutorial.units[unit.id].name
                    : '—'}
                {#if lesson !== undefined}&gt; {names}{/if}</Note
            >
            <Button
                tip={$creator.getLocale().ui.tooltip.nextLesson}
                action={() => navigate(progress.nextLesson() ?? progress)}
                enabled={progress.nextLesson() !== undefined}>→</Button
            >
        </nav>
        <div class="turns">
            {#each turns as turn, index}
                <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                <Speech
                    glyph={index % 2 === 0
                        ? Glyphs.Function
                        : concept?.getGlyphs($creator.getLanguages()) ??
                          Glyphs.Unparsable}
                    right={index % 2 === 0}
                    baseline
                    emotion={instructions
                        ? instructions[0]
                        : overviewStep
                        ? overviewStep[0]
                        : undefined}
                >
                    <DocHtmlView doc={turn.speech} spaces={turn.spaces} />
                </Speech>
            {/each}
        </div>
        <div class="controls">
            <Button
                tip={$creator.getLocale().ui.tooltip.previousLessonStep}
                action={() => navigate(progress.previousStep() ?? progress)}
                enabled={progress.previousStep() !== undefined}>&lt;</Button
            >
            <div class="progress"
                ><Note center
                    >{progress.step + 1} /
                    {lesson
                        ? lesson.scenes.length
                        : overview
                        ? overview.length
                        : '?'}</Note
                ></div
            >
            <Button
                tip={$creator.getLocale().ui.tooltip.nextLessonStep}
                action={() => navigate(progress.nextStep() ?? progress)}
                enabled={progress.nextStep() !== undefined}>&gt;</Button
            >
        </div>
    </div>
    {#if project}
        {#if lesson}
            <div class="project"
                ><ProjectView
                    {project}
                    bind:index={concepts}
                    close={() => goto('/')}
                    tip={$creator.getLocale().ui.tooltip.home}
                /></div
            >{:else}<PlayView {project} />{/if}
    {/if}
</section>

<style>
    .tutorial {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        position: absolute;
        padding: var(--wordplay-spacing);
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
    }

    .instructions {
        width: 30%;
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        font-size: 125%;
        flex-shrink: 0;
        flex-grow: 0;
        align-items: flex-start;
    }

    nav {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        width: 100%;
    }

    nav :global(button:last-child) {
        margin-left: auto;
    }

    .turns {
        flex-grow: 1;
        overflow: scroll;
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
        padding-top: calc(2 * var(--wordplay-spacing));
    }

    .project {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
    }

    .controls {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-items: last baseline;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .progress {
        flex-grow: 1;
        justify-self: center;
    }

    select {
        width: 1em;
        border: none;
        cursor: pointer;
    }

    select::after {
        content: 'a';
    }
</style>
