<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Tutorial from '../../tutorial/Tutorial';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import { preferredTranslations } from '../../translation/translations';
    import DescriptionView from '../../components/concepts/DescriptionView.svelte';
    import Explanation from '../../translation/Explanation';
    import { goto } from '$app/navigation';
    import { getProjects, getUser } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';

    const projects = getProjects();
    const user = getUser();

    /** The current place in the tutorial */
    let spot: Progress = new Progress(Tutorial, 'welcome', undefined, 0);
    $: unit = spot.getUnit();
    $: lesson = spot.getLesson();
    $: segment = spot.getSegment();
    $: tutorial = $preferredTranslations[0].tutorial;

    $: [instruction] =
        lesson && spot.segment
            ? $preferredTranslations[0].tutorial.concepts[lesson.concept][
                  spot.segment
              ]
            : [undefined];

    $: project = new Project(
        spot.getProjectID(),
        lesson ? lesson.concept : unit.id,
        segment ? segment.sources[0] : unit.sources[0],
        segment ? segment.sources.slice(1) : unit.sources.slice(1),
        undefined,
        $user ? [$user.uid] : [],
        false
    );

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
            const proj = $projects.get(spot.getProjectID());
            if (proj) project = proj;
        }
    }
</script>

<div class="tutorial">
    <div class="instructions"
        ><Note
            >{tutorial.units[unit.id].name}
            {#if lesson}&gt; {lesson.concept}
                {#if spot.segment}&gt; {spot.segment + 1} /
                    {lesson.segments.length}{/if}{/if}</Note
        ><Speech glyph={Glyphs.Function} below
            ><DescriptionView
                description={instruction === undefined
                    ? tutorial.units[unit.id].overview
                    : instruction instanceof Explanation
                    ? instruction
                    : Explanation.as(instruction)}
            /></Speech
        ></div
    >
    {#if project}
        {#if lesson}
            <div class="project"
                ><ProjectView
                    {project}
                    close={() => goto('/')}
                    tip={$preferredTranslations[0].ui.tooltip.home}
                /></div
            >{:else}<PlayView {project} />{/if}
    {/if}
</div>

<style>
    .tutorial {
        display: flex;
        flex-direction: row;
        gap: 2em;
        position: absolute;
        padding: 2em;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
    }

    .instructions {
        min-width: 25%;
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        font-size: 125%;
        flex: 1;
    }

    .project {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
    }
</style>
