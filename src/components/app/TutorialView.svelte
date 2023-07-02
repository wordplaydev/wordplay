<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import { goto } from '$app/navigation';
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
    import { creator, projects } from '../../db/Creator';
    import type Doc from '../../nodes/Doc';
    import type Spaces from '../../parser/Spaces';
    import { parseDoc, toTokens } from '../../parser/Parser';
    import DocHtmlView from '../concepts/DocHTMLView.svelte';
    import { setContext } from 'svelte';
    import type ConceptIndex from '../../concepts/ConceptIndex';
    import { writable, type Writable } from 'svelte/store';
    import { tick } from 'svelte';
    import type { Code, Dialog } from '../../locale/Locale';

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
    let turns: { speech: Doc; spaces: Spaces; dialog: Dialog }[] = [];
    $: turns = dialog
        ? dialog.map((line) => {
              const tokens = toTokens('`' + line.text + '`');
              return {
                  speech: parseDoc(tokens),
                  spaces: tokens.getSpaces(),
                  dialog: line,
              };
          })
        : [];

    const conceptPath = getConceptPath();

    /* 
        Silly workaround to only modify code when it actually changes. 
        The keyed each below should only update when it's different code,
        not just when it's assigned.
    */
    let code: Code;
    $: {
        let newCode = progress.getCode();
        if (newCode !== undefined && newCode !== code) {
            // Reset the concept path when code changes.
            conceptPath.set([]);
            code = newCode;
        }
        if (code === undefined) {
            code = { sources: ['Stage()'], fit: true, edit: false };
        }
    }

    $: project =
        code.sources.length > 0
            ? new Project(
                  progress.getProjectID(),
                  scene
                      ? scene.name
                      : act
                      ? act.name
                      : $creator.getLocale().wordplay,
                  new Source('main', code.sources[0]),
                  code.sources
                      .slice(1)
                      .map((source, index) => new Source(`${index}`, source)),
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
            if (existing !== undefined && !existing.equals(project))
                $creator.addProject(project);
        }
    }

    // Set a project context for those that depend on it, such as Palette.svelte.
    const projectStore: Writable<Project | undefined> = writable(undefined);
    setContext<ProjectContext>(ProjectSymbol, projectStore);
    $: projectStore.set(project);

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
        if (event.key === 'ArrowLeft' || event.key === 'Backspace')
            navigate(progress.previousPause() ?? progress);
        else if (
            event.key === 'ArrowRight' ||
            event.key === 'Enter' ||
            event.key === ' '
        )
            navigate(progress.nextPause() ?? progress);

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

<section class="tutorial">
    <div
        role="button"
        class="dialog"
        tabindex="0"
        on:keydown={handleKey}
        bind:this={view}
    >
        <nav>
            <!-- <Button
                tip={$creator.getLocale().ui.tooltip.previousLesson}
                action={() => navigate(progress.previousLesson() ?? progress)}
                enabled={progress.previousLesson() !== undefined}>≪</Button
            > -->
            <Button
                tip={$creator.getLocale().ui.tooltip.previousLessonStep}
                action={() => navigate(progress.previousPause() ?? progress)}
                enabled={progress.previousPause() !== undefined}>&lt;</Button
            >

            <!-- A hierarchical select of tutorial units and lessons  -->
            <select bind:value={selection} on:change={handleSelect}>
                {#each progress.tutorial as act, actIndex}
                    <optgroup label={act.name}>
                        {#each act.scenes as scene, sceneIndex}
                            <option
                                value={new Progress(
                                    progress.tutorial,
                                    actIndex + 1,
                                    sceneIndex + 1,
                                    1
                                )}>{scene.concept ?? scene.name}</option
                            >
                        {/each}
                    </optgroup>
                {/each}
            </select>
            <Note
                >{#if act !== undefined}{act.name}{/if}
                {#if act !== undefined && scene !== undefined}<br
                    />{scene.concept ?? scene.name}{/if}
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
                tip={$creator.getLocale().ui.tooltip.nextLessonStep}
                action={() => navigate(progress.nextPause() ?? progress)}
                enabled={progress.nextPause() !== undefined}>&gt;</Button
            >
        </nav>
        <div class="controls" />
        <div class="turns">
            {#if act === undefined}
                <div class="title play">{$creator.getLocale().wordplay}</div>
            {:else if scene === undefined}
                <div class="title act"
                    >Act {progress.act}<p><em>{act.name}</em></p></div
                >
            {:else if dialog === undefined}
                <div class="title scene"
                    >Scene {progress.scene}<p><em>{scene.name}</em></p
                    >{#if scene.concept}<em>{scene.concept}</em>{/if}</div
                >
            {:else}
                {#each turns as turn}
                    <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                    <Speech
                        glyph={$conceptsStore
                            ?.getConceptByName(turn.dialog.concept)
                            ?.getGlyphs($creator.getLanguages()) ?? {
                            symbols: turn.dialog.concept,
                        }}
                        right={turn.dialog.concept === 'FunctionDefinition'}
                        baseline
                        scroll={false}
                        emotion={turn.dialog.emotion}
                    >
                        <DocHtmlView doc={turn.speech} spaces={turn.spaces} />
                    </Speech>
                {/each}
            {/if}
        </div>
    </div>
    <!-- Create a new view from scratch when the code changes -->
    <!-- Autofocus the main editor if it's currently focused -->
    {#key code}
        {#if project}
            {#if scene && code}
                <div class="project"
                    ><ProjectView
                        {project}
                        bind:index={concepts}
                        close={() => goto('/')}
                        tip={$creator.getLocale().ui.tooltip.home}
                        editable={code.edit}
                        fit={code.fit}
                        autofocus={document.activeElement !== view}
                    /></div
                >{:else}<PlayView {project} />{/if}
        {/if}
    {/key}
</section>

<style>
    .tutorial {
        display: flex;
        flex-direction: row;
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
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
        font-size: 150%;
        text-align: center;
    }

    .scene {
        font-size: 120%;
        text-align: center;
    }

    .dialog {
        width: 30%;
        padding: calc(2 * var(--wordplay-spacing));
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        flex-shrink: 0;
        flex-grow: 0;
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
