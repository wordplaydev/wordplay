<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import {
        ConceptIndexSymbol,
        getUser,
        type ConceptIndexContext,
        ConceptPathSymbol,
        getConceptPath,
        type ProjectContext,
        ProjectSymbol,
    } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';
    import Button from '../widgets/Button.svelte';
    import Source from '../../nodes/Source';
    import { config, projects } from '../../db/Creator';
    import type Spaces from '../../parser/Spaces';
    import { toMarkup } from '../../parser/Parser';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import { setContext } from 'svelte';
    import type ConceptIndex from '../../concepts/ConceptIndex';
    import { writable, type Writable } from 'svelte/store';
    import { tick } from 'svelte';
    import { goto } from '$app/navigation';
    import ConceptLink from '../../nodes/ConceptLink';
    import TutorialHighlight from './TutorialHighlight.svelte';
    import Emotion from '../../lore/Emotion';
    import { Performances } from '../../tutorial/Performances';
    import type { Dialog, Performance } from '../../tutorial/Tutorial';
    import type Markup from '../../nodes/Markup';
    import Arrangement from '../../db/Arrangement';

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

    /** The current place in the tutorial */
    $: act = progress.getAct();
    $: scene = progress.getScene();
    $: dialog = progress.getDialog();

    /** Convert the instructions into a sequence of docs/space pairs */
    let turns: { speech: Markup; spaces: Spaces; dialog: Dialog }[] = [];
    $: turns = dialog
        ? dialog.map((line) => {
              const [, , ...text] = line;
              // Convert the list of paragraphs into a single doc.
              const [markup, spaces] = toMarkup(text.join('\n\n'));
              return {
                  speech: markup,
                  spaces: spaces,
                  dialog: line,
              };
          })
        : [];

    $: highlights = turns
        .map((turn) =>
            turn.speech
                .nodes()
                .filter(
                    (node): node is ConceptLink => node instanceof ConceptLink
                )
        )
        .flat()
        .filter((concept) => concept.concept.getText().startsWith('@UI/'))
        .map((concept) => concept.concept.getText().substring('@UI/'.length));

    const conceptPath = getConceptPath();

    /* 
        Silly workaround to only modify code when it actually changes. 
        The keyed each below should only update when it's different code,
        not just when it's assigned.
    */
    let performance: Performance;
    $: {
        let newPerformance = progress.getPerformance();
        if (newPerformance !== undefined && newPerformance !== performance) {
            // Reset the concept path when code changes.
            conceptPath.set([]);
            performance = newPerformance;
        }
        if (performance === undefined) {
            performance = ['fit', 'Stage()'];
        }
    }

    $: isUse = performance[0] === 'use';
    $: performanceType = isUse ? performance[1] : performance[0];
    $: editable = performanceType === 'edit' || performanceType === 'conflict';
    $: fit = performanceType === 'fit' || performanceType === 'use';
    // A "use" performance? Find it in Performances.
    // Anything else? Take all the lines of source and join them together.
    $: source = isUse
        ? Performances[performance[2] as keyof typeof Performances].apply(
              undefined,
              performance.slice(3) as any
          )
        : performance.slice(1).join('\n');

    // Figure out the default project to show.
    $: defaultProject = new Project(
        progress.getProjectID(),
        scene ? scene.name : act ? act.name : $config.getLocale().wordplay,
        new Source($config.getLocale().term.start, source),
        [],
        $config.getLocales(),
        undefined,
        $user ? [$user.uid] : [],
        false
    );

    // Start with the default project.
    $: project = defaultProject;

    // Set a project context for those that depend on it, such as Palette.svelte.
    const projectStore: Writable<Project | undefined> = writable(undefined);
    setContext<ProjectContext>(ProjectSymbol, projectStore);
    $: projectStore.set(project);

    // Any time the project database changes for the current ID, update the project.
    // This is what allows us to persist any edits to the project.
    $: if ($config) {
        const proj = $projects.getProject(progress.getProjectID());
        if (proj) project = proj;
    }

    // Any time the project changes, add/update it in projects.
    // This persists the project state for later.
    $: if (project) {
        const existing = $projects.getProject(project.id);
        if (existing !== undefined && !existing.equals(project))
            $config.addProject(project);
    }

    let selection: Progress | undefined = undefined;
    function handleSelect() {
        if (selection) navigate(selection);
    }

    async function handleKey(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'Backspace')
            navigate(progress.previousPause() ?? progress);
        else if (
            event.key === 'ArrowRight' ||
            event.key === 'Enter' ||
            event.key === ' '
        ) {
            const next = progress.nextPause();
            if (next) navigate(next);
            else goto('/projects');
        }

        // Focus the dialog after navigating.
        await tick();
        if (view) view.focus();
    }
</script>

<!-- If the body gets focus, focus the instructions. -->
<svelte:body
    on:focus={() => {
        tick().then(() => view?.focus());
    }}
/>

<section
    class="tutorial"
    class:vertical={$config.getArrangement() === Arrangement.Vertical}
>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        role="article"
        class="dialog"
        tabindex="0"
        on:keydown={handleKey}
        bind:this={view}
    >
        <div class="turns">
            {#if act === undefined}
                <div class="title play">{$config.getLocale().wordplay}</div>
            {:else if scene === undefined}
                <div class="title act"
                    >{$config.getLocale().term.act}
                    {progress.act}<p><em>{act.name}</em></p></div
                >
            {:else if dialog === undefined}
                <div class="title scene"
                    >{$config.getLocale().term.scene}
                    {progress.scene}<p><em>{scene.name}</em></p
                    >{#if scene.concept}<em>{scene.concept}</em>{/if}</div
                >
            {:else}
                {#key turns}
                    {#each turns as turn}
                        <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                        <Speech
                            glyph={$conceptsStore
                                ?.getConceptByName(turn.dialog[0])
                                ?.getGlyphs($config.getLocales()) ?? {
                                symbols: turn.dialog[0],
                            }}
                            flip={turn.dialog[0] !== 'FunctionDefinition'}
                            baseline
                            scroll={false}
                            emotion={Emotion[turn.dialog[1]]}
                        >
                            <MarkupHTMLView markup={turn.speech} />
                        </Speech>
                    {/each}
                {/key}
            {/if}
        </div>
        <nav>
            <!-- <Button
                tip={$creator.getLocale().ui.tooltip.previousLesson}
                action={() => navigate(progress.previousLesson() ?? progress)}
                enabled={progress.previousLesson() !== undefined}>≪</Button
            > -->
            <Button
                tip={$config.getLocale().ui.description.previousLessonStep}
                action={() => navigate(progress.previousPause() ?? progress)}
                active={progress.previousPause() !== undefined}>⇦</Button
            >

            <!-- A hierarchical select of tutorial units and lessons  -->
            <select bind:value={selection} on:change={handleSelect}>
                {#each progress.tutorial.acts as act, actIndex}
                    <optgroup label={act.name}>
                        {#each act.scenes as scene, sceneIndex}
                            <option
                                value={new Progress(
                                    progress.tutorial,
                                    actIndex + 1,
                                    sceneIndex + 1,
                                    0
                                )}>{scene.concept ?? scene.name}</option
                            >
                        {/each}
                    </optgroup>
                {/each}
            </select>
            <Note
                >{#if act !== undefined}{act.name}{/if}
                {#if act !== undefined && scene !== undefined}{#if $config.getArrangement() !== Arrangement.Vertical}<br
                        />{/if}{scene.concept ?? scene.name}{/if}
                {#if act !== undefined && scene !== undefined && progress.pause > 0}
                    <span class="progress"
                        >&ndash; {progress.pause} /
                        {scene
                            ? scene.lines.filter((line) => line === null)
                                  .length + 1
                            : '?'}</span
                    >{/if}</Note
            >
            <!-- <Button
                tip={$creator.getLocale().ui.tooltip.nextLesson}
                action={() => navigate(progress.nextLesson() ?? progress)}
                enabled={progress.nextLesson() !== undefined}>≫</Button
            > -->
            <Button
                tip={$config.getLocale().ui.description.nextLessonStep}
                action={() => navigate(progress.nextPause() ?? progress)}
                active={progress.nextPause() !== undefined}>⇨</Button
            >
        </nav>
    </div>
    <!-- Create a new view from scratch when the code changes -->
    <!-- Autofocus the main editor if it's currently focused -->
    {#key performance}
        {#if project}
            {#if scene && performance}
                <div class="project"
                    ><ProjectView
                        {project}
                        original={defaultProject}
                        bind:index={concepts}
                        {editable}
                        {fit}
                        autofocus={false}
                        showHelp={false}
                    /></div
                >{:else}<PlayView {project} {fit} />{/if}
        {/if}
    {/key}
</section>
{#key highlights}
    {#each highlights as highlight}
        <TutorialHighlight id={highlight} />
    {/each}
{/key}

<style>
    .tutorial {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        flex: 1;
        min-height: 0;
        min-width: 0;
        width: 100%;
    }

    .tutorial.vertical {
        flex-direction: column-reverse;
    }

    .title {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .title p {
        font-size: 200%;
        /* Prevents long words from overflowing. */
        overflow-wrap: anywhere;
    }

    .play {
        font-size: 200%;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
    }

    .act {
        text-transform: capitalize;
        font-size: 150%;
        text-align: center;
    }

    .scene {
        text-transform: capitalize;
        font-size: 120%;
        text-align: center;
    }

    .dialog {
        height: 100%;
        width: 30%;
        min-width: 30%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        gap: var(--wordplay-spacing);
        align-items: flex-start;
        border-right: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-left: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .vertical .dialog {
        height: 20%;
        width: 100%;
        min-height: 30%;
        min-width: 0;
    }

    .dialog:focus {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    nav {
        padding: var(--wordplay-spacing);
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
        padding: var(--wordplay-spacing);
        flex-grow: 1;
        overflow: scroll;
        overflow-clip-margin: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
        padding-top: calc(2 * var(--wordplay-spacing));
        width: 100%;
    }

    .project {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        min-width: 0;
        width: 100%;
        height: 100%;
    }

    .vertical .project {
        min-height: 0;
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
