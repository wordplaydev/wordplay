<script lang="ts">
    import Speech from '@components/lore/Speech.svelte';
    import ProjectView from '@components/project/ProjectView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { locales, Projects, Locales } from '@db/Database';
    import Project from '@db/projects/Project';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import type Node from '@nodes/Node';
    import { onMount, tick, untrack } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        getConceptPath,
        getUser,
        setConceptIndex,
        setConceptPath,
        setDragged,
        setProject,
        type ConceptIndexContext,
    } from '@components/project/Contexts';
    import Note from '@components/widgets/Note.svelte';
    import type ConceptIndex from '@concepts/ConceptIndex';
    import { moderatedFlags } from '@db/projects/Moderation';
    import { PersistenceType } from '@db/projects/ProjectHistory.svelte';
    import BasisCharacters from '../../lore/BasisCharacters';
    import { Emotion } from '../../lore/Emotion';
    import ConceptLink from '@nodes/ConceptLink';
    import type Markup from '@nodes/Markup';
    import Source from '@nodes/Source';
    import type Spaces from '@parser/Spaces';
    import { toMarkup } from '@parser/toMarkup';
    import { Performances } from '../../tutorial/Performances';
    import Progress from '../../tutorial/Progress';
    import {
        type Dialog,
        type Performance,
        type Tutorial,
    } from '../../tutorial/Tutorial';
    import { buildTutorialSearch } from '../../tutorial/tutorialSearch';
    import { searchItems, excerpt } from '@util/search';
    import { debounced } from '@util/debounce.svelte';
    import {
        actTitlePath,
        dialogTextPath,
        sceneSubtitlePath,
        sceneTitlePath,
    } from '../../tutorial/TutorialPath';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Breadcrumbs from '@components/app/Breadcrumbs.svelte';
    import Header from '@components/app/Header.svelte';
    import PlayView from '@components/app/PlayView.svelte';
    import TutorialHighlight from '@components/app/TutorialHighlight.svelte';
    import { localeGoto } from '@util/localeGoto';

    interface Props {
        progress: Progress;
        navigate: (progress: Progress) => Promise<void>;
        fallback: boolean;
    }

    let { progress, navigate }: Props = $props();

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
    const conceptPath = getConceptPath();

    // When navigating
    async function nav(progress: Progress) {
        // Reset the concept path after each navigation.
        conceptPath.set([]);
        // Navigate to the new progress.
        await navigate(progress);
    }

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

    /** Each dialog turn paired with its index in `scene.lines`, so we can build a
     *  stable override key for inline editing. */
    let dialogWithIndices = $derived(progress.getDialogWithIndices());

    /** Convert the instructions into a sequence of docs/space pairs */
    let turns: {
        speech: Markup;
        spaces: Spaces;
        dialog: Dialog;
        /** Joined raw markup text (Dialog[2..].join('\n\n')) used as the editor source. */
        rawText: string;
        /** Index of this dialog line in `scene.lines`; used for override keys. */
        lineIndex: number;
    }[] = $derived(
        dialogWithIndices
            ? dialogWithIndices.map(({ dialog: line, lineIndex }) => {
                  const [, , ...text] = line;
                  const rawText = text.join('\n\n');
                  // Convert the list of paragraphs into a single doc.
                  const [markup, spaces] = toMarkup(rawText);
                  return {
                      speech: markup,
                      spaces: spaces,
                      dialog: line,
                      rawText,
                      lineIndex,
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
            // Don't give the project a name, in case the locale changes.
            '',
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
        projectStore.set(project);
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
                        label: withoutAnnotations(
                            scene.subtitle ?? scene.title,
                        ),
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
            nav(newProgress);
        }
    }

    type SearchResult = {
        excerpt: string;
        progress: Progress;
        label: string;
    };

    let searchQuery = $state('');
    const debouncedQuery = debounced(() => searchQuery);

    // Tutorials for the non-primary selected locales, loaded so a multilingual
    // user can search content in any of their languages. The primary locale's
    // tutorial is `progress.tutorial`, already loaded by the route.
    let extraTutorials = $state<Tutorial[]>([]);
    $effect(() => {
        const primary = $locales.getLocale();
        const others = $locales.getLocales().filter((l) => l !== primary);
        let cancelled = false;
        Promise.all(
            others.map((l) => Locales.getTutorial(l.language, l.regions)),
        ).then((loaded) => {
            if (!cancelled)
                extraTutorials = loaded.filter(
                    (t): t is Tutorial => t !== undefined,
                );
        });
        return () => {
            cancelled = true;
        };
    });

    // All selected locales' tutorials, de-duplicated by language (a missing
    // translation falls back to en-US, which we don't want to index twice).
    let searchTutorials = $derived.by(() => {
        const byLanguage = new Map<string, Tutorial>();
        byLanguage.set(progress.tutorial.language, progress.tutorial);
        for (const t of extraTutorials)
            if (!byLanguage.has(t.language)) byLanguage.set(t.language, t);
        return [...byLanguage.values()];
    });

    // Precompute searchable records across every selected locale's tutorial.
    // Navigation uses parallel act/scene indices, so a match in any locale jumps
    // to the same scene (rendered in the displayed/primary locale).
    let searchRecords = $derived(
        searchTutorials.flatMap((t) =>
            buildTutorialSearch(t, $locales.getLanguages()),
        ),
    );

    // Compute search results from the debounced query using the shared policy.
    let searchResults = $derived.by((): SearchResult[] => {
        const tutorial = progress.tutorial;
        const languages = $locales.getLanguages();
        return searchItems(
            searchRecords,
            debouncedQuery.current,
            languages,
        ).map(([target, [display, start, end]]) => ({
            // 100 chars of context, matched range wrapped in * for Markup bold.
            excerpt: excerpt(display, start, end, 100, '*'),
            progress: new Progress(
                tutorial,
                target.act,
                target.scene,
                target.pause,
            ),
            label: target.label,
        }));
    });

    async function handleKey(event: KeyboardEvent) {
        // Ignore any modifiers; thhose are handled by the editor and project view.
        if (event.shiftKey || event.ctrlKey || event.altKey) return;

        focusView = undefined;
        if (event.key === 'ArrowLeft') {
            focusView = previousButton;
            nav(progress.previousPause() ?? progress);
        } else if (event.key === 'ArrowRight' || event.key === ' ') {
            focusView = nextButton;
            const next = progress.nextPause();
            if (next) nav(next);
            else localeGoto('/projects');
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
            if (
                document.activeElement === document.body &&
                newFocus !== undefined
            )
                setKeyboardFocus(
                    newFocus,
                    'Body received focus, focusing tutorial.',
                );
        });
    }}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section class="tutorial" onkeydown={handleKey}>
    <Breadcrumbs />
    <div class="header">
        <Header block={false}>
            <LocalizedText path={(l) => l.ui.page.learn.header} /></Header
        >
        <nav>
            {#if act !== undefined}
                <Note>
                    {withoutAnnotations(act.title)}
                    <sub
                        >{progress.tutorial.acts.findIndex(
                            (candidate) => candidate === act,
                        ) + 1}/{progress.tutorial.acts.length}</sub
                    ></Note
                >{/if}
            <!-- A select component tutorial lessons, grouped by unit. The value is always line zero so that the label is selected correctly.  -->
            <div class="nav-controls">
                <Options
                    label={(l) => l.ui.page.learn.options.lesson}
                    value={withoutAnnotations(
                        JSON.stringify(progress.withLine(0).serialize()),
                    )}
                    change={handleSelect}
                    id="current-lesson"
                    options={lessons}
                ></Options>
                <TextField
                    id="tutorial-search"
                    placeholder={(l) => l.ui.page.learn.search.placeholder}
                    description={(l) => l.ui.page.learn.search.placeholder}
                    bind:text={searchQuery}
                />
            </div>
        </nav>
    </div>
    {#if searchQuery.length > 0}
        <div class="search-results">
            {#if searchResults.length > 0}
                {#each searchResults as result}
                    <button
                        class="search-result"
                        onclick={() => {
                            nav(result.progress);
                            searchQuery = '';
                        }}
                    >
                        <small class="result-label">{result.label}</small>
                        <MarkupHTMLView markup={result.excerpt} inline />
                    </button>
                {/each}
            {:else if debouncedQuery.current.length > 0}
                <LocalizedText path={(l) => l.ui.page.learn.search.noResults} />
            {/if}
        </div>
    {:else}
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
                            tip={(l) => l.ui.page.learn.button.previous}
                            action={() =>
                                nav(progress.previousPause() ?? progress)}
                            active={progress.previousPause() !== undefined}
                            icon="←"
                            bind:view={previousButton}
                        ></Button>
                        {#if act !== undefined && scene !== undefined && (scene.subtitle ?? scene.title)}<Note
                                >{withoutAnnotations(
                                    scene.subtitle ?? scene.title,
                                )}
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
                            tip={(l) => l.ui.page.learn.button.next}
                            action={() => nav(progress.nextPause() ?? progress)}
                            active={progress.nextPause() !== undefined}
                            icon="→"
                            bind:view={nextButton}
                        ></Button>
                    </div>
                    {#if act === undefined}
                        <div class="title play"
                            ><LocalizedText path={(l) => l.wordplay} /></div
                        >
                    {:else if scene === undefined}
                        <div class="title act"
                            ><LocalizedText path={(l) => l.term.act} />
                            {progress.act}<p
                                ><em
                                    ><LocalizedText
                                        overrideKey={actTitlePath(
                                            progress.act - 1,
                                        )}
                                        sourceText={withoutAnnotations(
                                            act.title,
                                        )}
                                    /></em
                                ></p
                            ></div
                        >
                    {:else if dialog === undefined}
                        <div class="title scene"
                            ><LocalizedText path={(l) => l.term.scene} />
                            {progress.scene}<p
                                ><em
                                    ><LocalizedText
                                        overrideKey={sceneTitlePath(
                                            progress.act - 1,
                                            progress.scene - 1,
                                        )}
                                        sourceText={withoutAnnotations(
                                            scene.title,
                                        )}
                                    /></em
                                ></p
                            >{#if scene.subtitle}<em
                                    ><LocalizedText
                                        overrideKey={sceneSubtitlePath(
                                            progress.act - 1,
                                            progress.scene - 1,
                                        )}
                                        sourceText={withoutAnnotations(
                                            scene.subtitle,
                                        )}
                                    /></em
                                >{/if}</div
                        >
                    {:else}
                        {#key turns}
                            {#each turns as turn}
                                {@const character = turn.dialog[0]}
                                {@const concept =
                                    projectContext?.getConceptByName(character)}
                                <!-- First speaker is always function, alternating speakers are the concept we're learning about. -->
                                <Speech
                                    character={concept ??
                                        BasisCharacters[
                                            character as keyof typeof BasisCharacters
                                        ] ?? {
                                            symbols: character,
                                        }}
                                    flip={turn.dialog[0] !==
                                        'FunctionDefinition'}
                                    baseline
                                    scroll={false}
                                    emotion={Emotion[turn.dialog[1]]}
                                >
                                    {#snippet content()}
                                        <MarkupHTMLView
                                            markup={turn.speech}
                                            overrideKey={dialogTextPath(
                                                progress.act - 1,
                                                progress.scene - 1,
                                                turn.lineIndex,
                                            )}
                                            sourceText={turn.rawText}
                                        />
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
                                guide={false}
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
    {/if}
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
        flex-wrap: wrap;
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
        min-width: 20em;
        max-width: 30em;
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
        flex: 1;
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

    .nav-controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        flex-wrap: wrap;
    }

    .search-results {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        overflow-y: auto;
        flex: 1;
        padding: var(--wordplay-spacing);
    }

    .search-result {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: var(--wordplay-spacing);
        background: none;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
        text-align: left;
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        color: inherit;
        width: 100%;
    }

    .search-result:hover {
        background: var(--wordplay-hover);
    }

    .result-label {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    /* A responsive design for vertical screens. */
    @media (orientation: portrait) {
        .content {
            flex-direction: column;
        }

        .dialog {
            width: 100%;
            min-width: 0;
            max-width: none;
            max-height: fit-content;
            border-right: none;
            border-left: none;
            border-top: var(--wordplay-border-width) solid
                var(--wordplay-border-color);
            border-bottom: var(--wordplay-border-width) solid
                var(--wordplay-border-color);
        }
    }
</style>
