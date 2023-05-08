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

    const projects = getProjects();
    const user = getUser();

    /** The current place in the tutorial */
    let spot: Progress = new Progress(Tutorial);
    $: unit = spot.getUnit();
    $: lesson = spot.getLesson();
    $: segment = spot.getSegment();

    $: [instruction] =
        $preferredTranslations[0].tutorial.concepts[lesson.concept][
            spot.segment
        ];

    $: project = new Project(
        spot.getID(),
        lesson.concept,
        segment.sources[0],
        segment.sources.slice(1),
        undefined,
        $user ? [$user.uid] : [],
        false
    );

    // Any time the project changes, add/update it in projects.
    // This persists the project state for later.
    $: $projects.addProject(project);

    // Any time the project database changes for the current ID, update the project
    $: {
        if ($projects) {
            const proj = $projects.get(spot.getID());
            if (proj) project = proj;
        }
    }
</script>

<div class="tutorial">
    <div class="instructions"
        ><Note
            >{$preferredTranslations[0].tutorial.units[unit.id]} &gt; {lesson.concept}
            &gt; {spot.segment + 1} /
            {lesson.segments.length}</Note
        ><Speech glyph={Glyphs.Function} below
            ><DescriptionView
                description={instruction instanceof Explanation
                    ? instruction
                    : Explanation.as(instruction)}
            /></Speech
        ></div
    >
    <div class="project"
        ><ProjectView
            {project}
            close={() => goto('/')}
            tip={$preferredTranslations[0].ui.tooltip.home}
        /></div
    >
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
        width: 25%;
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
