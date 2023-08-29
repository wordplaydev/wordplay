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
    import { locale, locales, Projects } from '../../db/Database';
    import type Spaces from '../../parser/Spaces';
    import { toMarkup } from '../../parser/toMarkup';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import { onMount, setContext } from 'svelte';
    import type ConceptIndex from '../../concepts/ConceptIndex';
    import { writable } from 'svelte/store';
    import { tick } from 'svelte';
    import { goto } from '$app/navigation';
    import ConceptLink from '../../nodes/ConceptLink';
    import TutorialHighlight from './TutorialHighlight.svelte';
    import Emotion from '../../lore/Emotion';
    import { Performances } from '../../tutorial/Performances';
    import type { Dialog, Performance } from '../../tutorial/Tutorial';
    import type Markup from '../../nodes/Markup';
    import Header from './Header.svelte';

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

    let nextButton: HTMLButtonElement | undefined;
    let previousButton: HTMLButtonElement | undefined;
    let focusView: HTMLButtonElement | undefined = undefined;

    // Focus next button on load.
    onMount(() => nextButton?.focus());

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
              performance.slice(3) as [string]
          )
        : performance.slice(1).join('\n');

    // Every time the progress changes, create an initial project for the step.
    let initialProject: Project;
    $: if (
        initialProject === undefined ||
        progress.getProjectID() !== initialProject.id
    )
        initialProject = new Project(
            progress.getProjectID(),
            scene ? scene.title : act ? act.title : $locale.wordplay,
            new Source($locale.term.start, source),
            [],
            $locales,
            $user ? [$user.uid] : [],
            false,
            undefined,
            false
        );

    // Every time the progress changes, see if there's a revision to the project stored in the database,
    // and use that instead.
    $: {
        // Check asynchronously if there's a project for this tutorial project ID already.
        Projects.get(progress.getProjectID()).then((existingProject) => {
            // If there is, get it's store.
            if (existingProject)
                projectStore = Projects.getStore(progress.getProjectID());
            // If there's not, add this project to the database and get its store, so we can react to its changes.
            else
                projectStore = Projects.track(
                    initialProject,
                    true,
                    false,
                    false
                )?.getStore();
        });
    }

    // Every time the progress changes, get the store for the corresponding project, if there is one.
    $: projectStore = Projects.getStore(progress.getProjectID());

    // Every time the project store changes, update the context.
    $: if (projectStore)
        setContext<ProjectContext>(ProjectSymbol, projectStore);

    // When the project changes to something other than the initial project, start persisting it.
    $: if ($projectStore !== undefined && !$projectStore.equals(initialProject))
        Projects.getHistory($projectStore.id)?.setPersist();

    let selection: Progress | undefined = undefined;
    function handleSelect() {
        if (selection) navigate(selection);
    }

    async function handleKey(event: KeyboardEvent) {
        // Ignore any modifiers; thhose are handled by the editor and project view.
        if (event.shiftKey || event.ctrlKey || event.altKey) return;

        focusView = undefined;
        if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
            focusView = previousButton;
            navigate(progress.previousPause() ?? progress);
        } else if (
            event.key === 'ArrowRight' ||
            event.key === 'Enter' ||
            event.key === ' '
        ) {
            focusView = nextButton;
            const next = progress.nextPause();
            if (next) navigate(next);
            else goto('/projects');
        }

        await tick();
        focusView?.focus();
    }
</script>

<!-- If the body gets focus, focus the instructions. -->
<svelte:body
    on:focus|preventDefault|stopPropagation={() =>
        tick().then(() => (focusView ?? nextButton)?.focus())}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<section
    class="tutorial"
    on:keydown={handleKey}
    on:pointerdown|stopPropagation|preventDefault={() => nextButton?.focus()}
>
    <div class="header">
        <Header>Learn</Header>
        <nav>
            <Button
                tip={$locale.ui.page.learn.button.previous}
                action={() => navigate(progress.previousPause() ?? progress)}
                active={progress.previousPause() !== undefined}
                bind:view={previousButton}>⇦</Button
            >
            <Button
                tip={$locale.ui.page.learn.button.next}
                action={() => navigate(progress.nextPause() ?? progress)}
                active={progress.nextPause() !== undefined}
                bind:view={nextButton}>⇨</Button
            >
            <!-- A hierarchical select of tutorial units and lessons  -->
            <select
                bind:value={selection}
                on:change={handleSelect}
                on:pointerdown|stopPropagation
                on:keydown|stopPropagation
            >
                {#each progress.tutorial.acts as act, actIndex}
                    <optgroup label={act.title}>
                        {#each act.scenes as scene, sceneIndex}
                            <option
                                value={new Progress(
                                    progress.tutorial,
                                    actIndex + 1,
                                    sceneIndex + 1,
                                    0
                                )}>{scene.subtitle ?? scene.title}</option
                            >
                        {/each}
                    </optgroup>
                {/each}
            </select>
            <Note
                >{#if act !== undefined}{act.title}{/if}
                {#if act !== undefined && scene !== undefined}&mdash; {scene.subtitle ??
                        scene.title}{/if}
                {#if act !== undefined && scene !== undefined && progress.pause > 0}
                    <span class="progress"
                        >&mdash; {progress.pause} /
                        {scene
                            ? scene.lines.filter((line) => line === null)
                                  .length + 1
                            : '?'}</span
                    >{/if}</Note
            >
        </nav>
    </div>
    <div class="content">
        <div role="article" class="dialog">
            <div class="turns" aria-live="assertive">
                {#if act === undefined}
                    <div class="title play">{$locale.wordplay}</div>
                {:else if scene === undefined}
                    <div class="title act"
                        >{$locale.term.act}
                        {progress.act}<p><em>{act.title}</em></p></div
                    >
                {:else if dialog === undefined}
                    <div class="title scene"
                        >{$locale.term.scene}
                        {progress.scene}<p><em>{scene.title}</em></p
                        >{#if scene.subtitle}<em>{scene.subtitle}</em>{/if}</div
                    >
                {:else}
                    {#key turns}
                        {#each turns as turn}
                            <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                            <Speech
                                glyph={$conceptsStore
                                    ?.getConceptByName(turn.dialog[0])
                                    ?.getGlyphs($locales) ?? {
                                    symbols: turn.dialog[0],
                                }}
                                flip={turn.dialog[0] !== 'FunctionDefinition'}
                                baseline
                                scroll={false}
                                emotion={Emotion[turn.dialog[1]]}
                            >
                                <svelte:fragment slot="content">
                                    <MarkupHTMLView markup={turn.speech} />
                                </svelte:fragment>
                            </Speech>
                        {/each}
                    {/key}
                {/if}
            </div>
        </div>
        <!-- Create a new view from scratch when the code changes -->
        <!-- Autofocus the main editor if it's currently focused -->
        {#key initialProject}
            {#if scene}
                <div class="project"
                    ><ProjectView
                        project={$projectStore ?? initialProject}
                        original={initialProject}
                        bind:index={concepts}
                        playing={!editable}
                        {fit}
                        autofocus={false}
                        showHelp={false}
                    /></div
                >{:else}<PlayView
                    project={$projectStore ?? initialProject}
                    {fit}
                />{/if}
        {/key}
    </div>
</section>
{#key highlights}
    {#each highlights as highlight}
        <TutorialHighlight id={highlight} />
    {/each}
{/key}

<style>
    .tutorial {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        width: 100%;
        height: 100%;
    }

    .header {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }

    .content {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        flex: 1;
        min-height: 0;
        min-width: 0;
        width: 100%;
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

    .dialog:focus {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    nav {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: center;
        width: 100%;
    }

    .turns {
        padding: var(--wordplay-spacing);
        flex-grow: 1;
        overflow: auto;
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

    .progress {
        flex-grow: 1;
        justify-self: center;
    }

    select {
        width: 1.25em;
        border: none;
        cursor: pointer;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
    }

    select:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        font-weight: bold;
        outline: none;
    }

    select::after {
        content: 'a';
    }
</style>
