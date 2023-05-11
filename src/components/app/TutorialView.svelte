<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import {
        preferredLocale,
        preferredLocales,
    } from '../../translation/locales';
    import DescriptionView from '../../components/concepts/DescriptionView.svelte';
    import { goto } from '$app/navigation';
    import { getProjects, getUser } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';
    import Button from '../widgets/Button.svelte';
    import { getTutorial } from '../../tutorial/Tutorial';
    import Source from '../../nodes/Source';
    import type Lesson from '../../tutorial/Lesson';
    import type { FixedArray } from '../../translation/Locale';

    const projects = getProjects();
    const user = getUser();

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
                if (isFinite(number) && texts[number] !== undefined) {
                    localized += texts[number];
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
    $: tutorial = getTutorial($preferredLocale);
    $: progress = new Progress(tutorial, 'welcome', 0, 0);
    $: unit = progress.getUnit();
    $: lesson = progress.getLesson();
    $: names = lesson ? getName(lesson) : '–';
    $: step = progress.getStep();

    $: project =
        unit && step && step.sources.length > 0 && lesson
            ? new Project(
                  progress.getProjectID(),
                  lesson ? names : unit.id,
                  new Source(
                      'main',
                      localize(
                          step ? step.sources[0] : unit.sources[0],
                          lesson.concept.tutorial.text
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
            const existing = $projects.get(project.id);
            if (existing !== undefined && !existing.equals(project))
                $projects.addProject(project);
        }
    }

    // Any time the project database changes for the current ID, update the project
    $: {
        if ($projects) {
            const proj = $projects.get(progress.getProjectID());
            if (proj) project = proj;
        }
    }

    let selection: Progress | undefined = undefined;
    function handleSelect() {
        if (selection) progress = selection;
    }
</script>

<div class="tutorial">
    <div class="instructions">
        <nav>
            <Button
                tip={$preferredLocale.ui.tooltip.previousLesson}
                action={() =>
                    (progress = progress.previousLesson() ?? progress)}
                enabled={progress.previousLesson() !== undefined}>←</Button
            >
            <!-- A hierarchical select of tutorial units and lessons  -->
            <select bind:value={selection} on:change={handleSelect}>
                {#each tutorial as unit}
                    <optgroup
                        label={$preferredLocale.tutorial.units[unit.id].name}
                    >
                        {#each unit.lessons as lesson, index}
                            <option
                                value={new Progress(
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
                >{unit ? $preferredLocale.tutorial.units[unit.id].name : '—'}
                {#if lesson !== undefined}&gt; {names}{/if}</Note
            >
            <Button
                tip={$preferredLocale.ui.tooltip.nextLesson}
                action={() => (progress = progress.nextLesson() ?? progress)}
                enabled={progress.nextLesson() !== undefined}>→</Button
            >
        </nav>
        <Speech glyph={Glyphs.Function} below>
            <DescriptionView
                description={step === undefined && unit
                    ? $preferredLocale.tutorial.units[unit.id].overview
                    : lesson !== undefined &&
                      lesson.concept.tutorial.instructions[progress.step] !==
                          undefined
                    ? localize(
                          lesson.concept.tutorial.instructions[progress.step],
                          lesson.concept.tutorial.text
                      )
                    : '—'}
            />
            <div class="controls">
                <Button
                    tip={$preferredLocale.ui.tooltip.previousLessonStep}
                    action={() =>
                        (progress = progress.previousStep() ?? progress)}
                    enabled={progress.previousStep() !== undefined}>&lt;</Button
                >
                <div class="progress"
                    ><Note center
                        >{#if lesson && progress.step !== undefined}{progress.step +
                                1} /
                            {lesson.steps.length}{:else}◆{/if}</Note
                    ></div
                >
                <Button
                    tip={$preferredLocale.ui.tooltip.nextLessonStep}
                    action={() => (progress = progress.nextStep() ?? progress)}
                    enabled={progress.nextStep() !== undefined}>&gt;</Button
                >
            </div>
        </Speech>
    </div>
    {#if project}
        {#if lesson}
            <div class="project"
                >{#key project}<ProjectView
                        {project}
                        close={() => goto('/')}
                        tip={$preferredLocales[0].ui.tooltip.home}
                    />{/key}</div
            >{:else}<PlayView {project} />{/if}
    {/if}
</div>

<style>
    .tutorial {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        position: absolute;
        padding: 1em;
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
    }

    nav {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    nav :global(button:last-child) {
        margin-left: auto;
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
        margin-top: var(--wordplay-spacing);
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
