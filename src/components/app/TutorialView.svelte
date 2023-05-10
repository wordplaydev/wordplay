<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Tutorial from '../../tutorial/Tutorial';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import {
        preferredTranslation,
        preferredTranslations,
    } from '../../translation/translations';
    import DescriptionView from '../../components/concepts/DescriptionView.svelte';
    import { goto } from '$app/navigation';
    import { getProjects, getUser } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';
    import Button from '../widgets/Button.svelte';

    const projects = getProjects();
    const user = getUser();

    /** The current place in the tutorial */
    let progress: Progress = new Progress(Tutorial, 'welcome', undefined, 0);
    $: unit = progress.getUnit();
    $: lesson = progress.getLesson();
    $: segment = progress.getStep();
    $: tutorial = $preferredTranslation.tutorial;

    $: [step] =
        lesson && progress.step
            ? $preferredTranslation.tutorial.concepts[lesson.concept][
                  progress.step
              ]
            : [undefined];

    $: project = unit
        ? new Project(
              progress.getProjectID(),
              lesson ? lesson.concept : unit.id,
              segment ? segment.sources[0] : unit.sources[0],
              segment ? segment.sources.slice(1) : unit.sources.slice(1),
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
</script>

<div class="tutorial">
    <div class="instructions">
        <nav>
            <Button
                tip={$preferredTranslation.ui.tooltip.previousLesson}
                action={() =>
                    (progress = progress.previousLesson() ?? progress)}
                enabled={progress.previousLesson() !== undefined}>⇦</Button
            ><Note
                >{unit ? tutorial.units[unit.id].name : '—'}
                {#if lesson}&gt; {lesson.concept}{/if}</Note
            >
            <Button
                tip={$preferredTranslation.ui.tooltip.nextLesson}
                action={() => (progress = progress.nextLesson() ?? progress)}
                enabled={progress.nextLesson() !== undefined}>⇨</Button
            >
        </nav>
        <Speech glyph={Glyphs.Function} below>
            <DescriptionView
                description={step === undefined && unit
                    ? tutorial.units[unit.id].overview
                    : step !== undefined
                    ? step
                    : ''}
            />
            <div class="controls">
                <Button
                    tip={$preferredTranslation.ui.tooltip.previousLessonStep}
                    action={() =>
                        (progress = progress.previousStep() ?? progress)}
                    enabled={progress.previousStep() !== undefined}>&lt;</Button
                >
                <div class="progress"
                    ><Note center
                        >{#if lesson && progress.step !== undefined}{progress.step +
                                1} /
                            {lesson.steps.length}{/if}</Note
                    ></div
                >
                <Button
                    tip={$preferredTranslation.ui.tooltip.nextLessonStep}
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
                        tip={$preferredTranslations[0].ui.tooltip.home}
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
</style>
