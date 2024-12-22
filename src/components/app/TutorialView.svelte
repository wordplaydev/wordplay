<script lang="ts">
    import ProjectView from '@components/project/ProjectView.svelte';
    import Project from '@models/Project';
    import Speech from '@components/lore/Speech.svelte';
    import Progress from '../../tutorial/Progress';
    import Note from '../../components/widgets/Note.svelte';
    import {
        getUser,
        getConceptPath,
        type ConceptIndexContext,
        setConceptIndex,
        setDragged,
        setProject,
        setConceptPath,
    } from '../../components/project/Contexts';
    import PlayView from './PlayView.svelte';
    import Button from '../widgets/Button.svelte';
    import Source from '../../nodes/Source';
    import { locales, Projects } from '@db/Database';
    import type Spaces from '../../parser/Spaces';
    import { toMarkup } from '../../parser/toMarkup';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import { onMount, setContext, untrack } from 'svelte';
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
    import Header from './Header.svelte';
    import { PersistenceType } from '../../db/ProjectHistory.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { moderatedFlags } from '../../models/Moderation';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import type Node from '@nodes/Node';

    interface Props {
        progress: Progress;
        navigate: (progress: Progress) => void;
        fallback: boolean;
    }

    let { progress, navigate, fallback }: Props = $props();

    // Get the concept index and path from the project view and put it in
    // a store, and the store in a context so that ContextViewUI can access the index.
    let projectContext: ConceptIndex | undefined = $state(undefined);
    let conceptsStore = $state<ConceptIndexContext>({ index: undefined });
    $effect(() => {
        conceptsStore.index = projectContext;
    });
    setConceptIndex(conceptsStore);

    // Create a concept path for children
    setConceptPath(writable([]));

    const user = getUser();

    let nextButton: HTMLButtonElement | undefined = $state();
    let previousButton: HTMLButtonElement | undefined = $state();
    let focusView: HTMLButtonElement | undefined = $state(undefined);

    // Focus next button on load.
    onMount(() => {
        if (nextButton)
            setKeyboardFocus(nextButton, 'Tutorial focusing next button');
    });

    /** The current place in the tutorial. Defaults to persisted progress, but overwritten by search parameters. */
    let act = $derived(progress.getAct());
    let scene = $derived(progress.getScene());
    let dialog = $derived(progress.getDialog());

    /** This is bound to the project view's context */
    let dragged = $state<Node | undefined>();

    /** This is the tutorial's own dragged store, which we keep in a context */
    let localDragged = writable<Node | undefined>();
    setDragged(localDragged);

    /** Whenever the local tutorial dragged context changes, push it to the project's store */
    $effect(() => {
        dragged = $localDragged;
    });

    /** Convert the instructions into a sequence of docs/space pairs */
    let turns: { speech: Markup; spaces: Spaces; dialog: Dialog }[] = $derived(
        dialog
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
            : [],
    );

    let highlights = $derived(
        turns
            .map((turn) =>
                turn.speech
                    .nodes()
                    .filter(
                        (node): node is ConceptLink =>
                            node instanceof ConceptLink,
                    ),
            )
            .flat()
            .filter((concept) => concept.concept.getText().startsWith('@UI/'))
            .map((concept) =>
                concept.concept.getText().substring('@UI/'.length),
            ),
    );

    const conceptPath = getConceptPath();

    /* 
        Silly workaround to only modify code when it actually changes. 
        The keyed each below should only update when it's different code,
        not just when it's assigned.
    */
    let performance = $state<Performance | undefined>();
    $effect(() => {
        let newPerformance = progress.getPerformance();
        // Only update the performance when progress changes.
        untrack(() => {
            if (
                newPerformance !== undefined &&
                newPerformance !== performance &&
                conceptPath
            ) {
                // Reset the concept path when code changes.
                conceptPath.set([]);
                performance = newPerformance;
            }
            if (performance === undefined) {
                performance = ['fit', 'Stage()'];
            }
        });
    });

    let isUse = $derived(performance !== undefined && performance[0] === 'use');
    let performanceType = $derived(
        performance === undefined
            ? ''
            : isUse
              ? performance[1]
              : performance[0],
    );
    let editable = $derived(
        performanceType === 'edit' || performanceType === 'conflict',
    );
    let fit = $derived(performanceType === 'fit' || performanceType === 'use');
    // A "use" performance? Find it in Performances.
    // Anything else? Take all the lines of source and join them together.
    let source = $derived(
        performance === undefined
            ? ''
            : isUse
              ? Performances[performance[2] as keyof typeof Performances].apply(
                    undefined,
                    performance.slice(3) as [string],
                )
              : performance.slice(1).join('\n'),
    );

    // Every time the progress changes, create an initial project for the step.
    let initialProject = $derived(
        Project.make(
            progress.getProjectID(),
            scene
                ? scene.title
                : act
                  ? act.title
                  : $locales.getLocale().wordplay,
            // Don't give the souce a name, otherwise it won't be localized on language change.
            new Source('', source),
            [],
            $locales.getLocales(),
            $user?.uid ?? null,
            [],
            false,
            undefined,
            false,
            false,
            false,
            null,
            moderatedFlags(),
        ),
    );

    // Keep the current project state.
    let project = $state<Project | undefined>();

    // Every time the progress changes, see if there's a revision to the project stored in the database,
    // and use that instead, and update the project store.
    $effect(() => {
        // Check asynchronously if there's a project for this tutorial project ID already.
        Projects.get(progress.getProjectID()).then((existingProject) => {
            // If there is, get it's store.
            if (existingProject) {
                project = existingProject;
            }
            // If there's not, add this project to the database and get its store, so it can be editable.
            else if (initialProject) {
                project = initialProject;
                Projects.track(
                    initialProject,
                    true,
                    PersistenceType.Local,
                    false,
                );
            }
        });
    });

    // When history's current value changes, update the project. This is super important: it enables feedback
    // after each edit of a project!
    $effect(() => {
        const history = Projects.getHistory(progress.getProjectID());
        project = history?.getCurrent();
    });

    // Create a reactive context of the current project.
    const projectStore = writable<Project | undefined>(undefined);
    setProject(projectStore);

    // Every time the project store changes, update the project context.
    $effect(() => {
        projectStore.set($projectStore);
    });

    // When the project changes to something other than the initial project, start persisting it.
    $effect(() => {
        if (
            initialProject &&
            project !== undefined &&
            !project.equals(initialProject)
        )
            Projects.getHistory(project.getID())?.setPersist(
                PersistenceType.Local,
            );
    });

    // Compute the options for the select based on the tutorial
    let lessons = $derived(
        progress.tutorial.acts.map((act, actIndex) => {
            return {
                label: act.title,
                options: act.scenes.map((scene, sceneIndex) => {
                    return {
                        value: JSON.stringify(
                            new Progress(
                                progress.tutorial,
                                actIndex + 1,
                                sceneIndex + 1,
                                0,
                            ).serialize(),
                        ),
                        label: scene.subtitle ?? scene.title,
                    };
                }),
            };
        }),
    );

    function handleSelect(lesson: string | undefined) {
        if (lesson === undefined) return;
        const lessonJSON = JSON.parse(lesson);
        if (
            'act' in lessonJSON &&
            typeof lessonJSON.act === 'number' &&
            'scene' in lessonJSON &&
            typeof lessonJSON.scene === 'number' &&
            'line' in lessonJSON &&
            typeof lessonJSON.line === 'number'
        ) {
            const newProgress = new Progress(
                progress.tutorial,
                lessonJSON.act,
                lessonJSON.scene,
                lessonJSON.line,
            );
            navigate(newProgress);
        }
    }

    async function handleKey(event: KeyboardEvent) {
        // Ignore any modifiers; thhose are handled by the editor and project view.
        if (event.shiftKey || event.ctrlKey || event.altKey) return;

        focusView = undefined;
        if (event.key === 'ArrowLeft') {
            focusView = previousButton;
            navigate(progress.previousPause() ?? progress);
        } else if (event.key === 'ArrowRight' || event.key === ' ') {
            focusView = nextButton;
            const next = progress.nextPause();
            if (next) navigate(next);
            else goto('/projects');
        }

        await tick();
        if (focusView)
            setKeyboardFocus(
                focusView,
                'Tutorial focusing previously focused navigation button',
            );
    }
</script>

<!-- If the body gets focus, focus the instructions. -->
<svelte:body
    onfocus={(event) => {
        event.preventDefault();
        event.stopPropagation();
        tick().then(() => {
            const newFocus = focusView ?? nextButton;
            if (newFocus)
                setKeyboardFocus(
                    newFocus,
                    'Body received focus, focusing tutorial.',
                );
        });
    }}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section class="tutorial" onkeydown={handleKey}>
    <div class="header">
        <Header block={false}
            >{#if fallback}🚧{/if}
            {$locales.get(
                (l) => l.ui.page.learn.header,
            )}{#if fallback}🚧{/if}</Header
        >
        <nav>
            {#if act !== undefined}
                <Note>
                    {act.title}
                    <sub
                        >{progress.tutorial.acts.findIndex(
                            (candidate) => candidate === act,
                        ) + 1}/{progress.tutorial.acts.length}</sub
                    ></Note
                >{/if}
            <!-- A select component tutorial lessons, grouped by unit. The value is always line zero so that the label is selected correctly.  -->
            <Options
                label={$locales.get((l) => l.ui.page.learn.options.lesson)}
                value={JSON.stringify(progress.withLine(0).serialize())}
                change={handleSelect}
                id="current-lesson"
                options={lessons}
            ></Options>
        </nav>
    </div>
    <div class="content">
        <div role="article" class="dialog">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="turns"
                aria-live="assertive"
                onclick={(event) => {
                    if (nextButton) {
                        event.stopPropagation();
                        setKeyboardFocus(
                            nextButton,
                            'Focusing next button after chat click',
                        );
                    }
                }}
            >
                <div class="controls">
                    <Button
                        large
                        tip={$locales.get(
                            (l) => l.ui.page.learn.button.previous,
                        )}
                        action={() =>
                            navigate(progress.previousPause() ?? progress)}
                        active={progress.previousPause() !== undefined}
                        bind:view={previousButton}>←</Button
                    >
                    {#if act !== undefined && scene !== undefined && (scene.subtitle ?? scene.title)}<Note
                            >{scene.subtitle ?? scene.title}
                            {#if act !== undefined && scene !== undefined && progress.pause > 0}
                                <sub class="progress"
                                    >{progress.pause}/{scene
                                        ? scene.lines.filter(
                                              (line) => line === null,
                                          ).length + 1
                                        : '?'}</sub
                                >{/if}</Note
                        >{/if}
                    <Button
                        large
                        tip={$locales.get((l) => l.ui.page.learn.button.next)}
                        action={() =>
                            navigate(progress.nextPause() ?? progress)}
                        active={progress.nextPause() !== undefined}
                        bind:view={nextButton}>→</Button
                    >
                </div>
                {#if act === undefined}
                    <div class="title play"
                        >{$locales.get((l) => l.wordplay)}</div
                    >
                {:else if scene === undefined}
                    <div class="title act"
                        >{$locales.get((l) => l.term.act)}
                        {progress.act}<p><em>{act.title}</em></p></div
                    >
                {:else if dialog === undefined}
                    <div class="title scene"
                        >{$locales.get((l) => l.term.scene)}
                        {progress.scene}<p><em>{scene.title}</em></p
                        >{#if scene.subtitle}<em>{scene.subtitle}</em>{/if}</div
                    >
                {:else}
                    {#key turns}
                        {#each turns as turn}
                            <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                            <Speech
                                glyph={projectContext
                                    ?.getConceptByName(turn.dialog[0])
                                    ?.getGlyphs($locales) ?? {
                                    symbols: turn.dialog[0],
                                }}
                                flip={turn.dialog[0] !== 'FunctionDefinition'}
                                baseline
                                scroll={false}
                                emotion={Emotion[turn.dialog[1]]}
                            >
                                {#snippet content()}
                                    <MarkupHTMLView markup={turn.speech} />
                                {/snippet}
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
                {@const currentProject = project ?? initialProject}
                {#if currentProject}
                    <div class="project"
                        ><ProjectView
                            project={currentProject}
                            original={initialProject}
                            bind:index={projectContext}
                            bind:dragged
                            showOutput={!editable}
                            {fit}
                            autofocus={false}
                            warn={false}
                            shareable={false}
                            persistLayout={false}
                        /></div
                    >
                {/if}
            {:else}
                {@const currentProject = project ?? initialProject}
                {#if currentProject}
                    <PlayView project={currentProject} {fit} />
                {/if}
            {/if}
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
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
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
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        justify-content: center;
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

    .controls {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
    }
</style>
