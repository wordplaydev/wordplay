<script lang="ts">
    import getConceptName from '@locale/getConceptName';
    import Speech from '@components/lore/Speech.svelte';
    import ProjectView from '@components/project/ProjectView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import {
        locales,
        Projects,
        Locales,
        Settings,
        contrastLanguage,
    } from '@db/Database';
    import { ContrastLanguages } from '../../tutorial/ContrastLanguage';
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
    import type LanguageCode from '@locale/LanguageCode';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import { MULTILINGUAL_SEPARATOR } from '@locale/Locales';
    import type Markup from '@nodes/Markup';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import { toMarkup } from '@parser/toMarkup';
    import { Performances } from '../../tutorial/Performances';
    import Progress from '../../tutorial/Progress';
    import {
        DEFAULT_TUTORIAL_MODE,
        type TutorialMode,
    } from '../../tutorial/TutorialMode';
    import {
        parsePerformance,
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
    import PageHeaderRow from '@components/app/PageHeaderRow.svelte';
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

    /** Switch tutorial modes: persist the choice and route to the mode's tutorial, which the
     * learn route loads and resumes at the mode's saved place. */
    async function switchMode(newMode: TutorialMode) {
        if (newMode === progress.mode) return;
        Settings.setTutorialMode(newMode);
        await localeGoto(
            newMode === DEFAULT_TUTORIAL_MODE
                ? '/learn'
                : `/learn?tutorial=${newMode}`,
        );
    }

    // Options for the contrast-language chooser (shown in the quick tutorial).
    const contrastOptions = ContrastLanguages.map((language) => ({
        value: language.tag,
        label: language.label,
    }));

    const user = getUser();

    let nextButton: HTMLButtonElement | undefined = $state();
    let previousButton: HTMLButtonElement | undefined = $state();
    let focusView: HTMLButtonElement | undefined = $state(undefined);

    /** Focus the navigation button the user is heading toward, falling back to the other when the
     * preferred one is inactive. At the tutorial's end the next button is inactive (aria-disabled,
     * but still focusable), so focusing it would leave focus on an inert control — there we focus
     * the previous button instead. `at` is the position to evaluate (the step being navigated to),
     * not necessarily the current prop, which may not have updated yet. */
    function focusNav(at: Progress, prefer: 'next' | 'previous') {
        const hasNext = at.nextPause() !== undefined;
        const hasPrevious = at.previousPause() !== undefined;
        const target =
            prefer === 'next'
                ? hasNext
                    ? nextButton
                    : hasPrevious
                      ? previousButton
                      : undefined
                : hasPrevious
                  ? previousButton
                  : hasNext
                    ? nextButton
                    : undefined;
        focusView = target;
        if (target)
            setKeyboardFocus(target, 'Tutorial focusing navigation button');
    }

    // Focus the next button on load — or the previous button if we're already at the end.
    onMount(() => focusNav(progress, 'next'));

    // If navigation settles somewhere the focused nav button is inactive — notably the tutorial's
    // end, where next is disabled, and which a deep link may only reach after the position resolves
    // post-mount — move focus to the other, active button so focus never rests on an inert control.
    $effect(() => {
        const noNext = progress.nextPause() === undefined;
        const noPrevious = progress.previousPause() === undefined;
        untrack(() => {
            if (noNext && document.activeElement === nextButton)
                focusNav(progress, 'previous');
            else if (noPrevious && document.activeElement === previousButton)
                focusNav(progress, 'next');
        });
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

    /** For a dialog line, the same line rendered in each non-primary chosen locale's
     *  tutorial — matched by parallel act/scene/line index — to echo beneath the primary
     *  (dimmed and smaller, like other multilingual UI text). Skips locales whose text is
     *  missing or identical to the primary. */
    function dialogEchoes(
        lineIndex: number,
        primaryRawText: string,
    ): { language: LanguageCode; direction: 'ltr' | 'rtl'; markup: Markup }[] {
        const actIndex = progress.act - 1;
        const sceneIndex = progress.scene - 1;
        const echoes: {
            language: LanguageCode;
            direction: 'ltr' | 'rtl';
            markup: Markup;
        }[] = [];
        const seen = new Set([primaryRawText.trim()]);
        for (const tutorial of extraTutorials) {
            const line =
                tutorial.acts[actIndex]?.scenes[sceneIndex]?.lines[lineIndex];
            if (!Array.isArray(line)) continue;
            const rawText = line
                .slice(2)
                .filter((part): part is string => typeof part === 'string')
                .join('\n\n')
                .trim();
            if (rawText.length === 0 || seen.has(rawText)) continue;
            seen.add(rawText);
            const [markup] = toMarkup(rawText);
            echoes.push({
                language: tutorial.language,
                direction: getLanguageDirection(tutorial.language),
                markup,
            });
        }
        return echoes;
    }

    /** Convert the instructions into a sequence of docs/space pairs */
    let turns: {
        speech: Markup;
        spaces: Spaces;
        dialog: Dialog;
        /** Joined raw markup text (Dialog[2..].join('\n\n')) used as the editor source. */
        rawText: string;
        /** Index of this dialog line in `scene.lines`; used for override keys. */
        lineIndex: number;
        /** The same line in each non-primary chosen locale, for multilingual echoes. */
        others: {
            language: LanguageCode;
            direction: 'ltr' | 'rtl';
            markup: Markup;
        }[];
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
                      others: dialogEchoes(lineIndex, rawText),
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
                performance = { fit: 'Stage()' };
            }
        });
    });

    // The current performance, parsed into structured, type-safe parts.
    let parsed = $derived(
        performance === undefined ? undefined : parsePerformance(performance),
    );
    let editable = $derived(parsed?.mode === 'edit');
    let fit = $derived(parsed?.mode === 'fit');
    // Whether ProjectView shows output-only (vs. the editor + output). A component-scoped derived
    // rather than an inline `{!editable}` prop, so it isn't destroyed with the {#key} block while
    // ProjectView tears down (which triggers a "now-destroyed derived" warning).
    let showOutput = $derived(!editable);
    // Show the editor's annotation panel expanded when the performance asks for it (independent of
    // whether conflicts are expected).
    let annotationsExpanded = $derived(parsed?.sidebar ?? false);
    // Tidy code so performances don't need perfect indentation/spacing: parse it and re-serialize
    // with the language's preferred spacing.
    function tidy(code: string): string {
        const parsedSource = new Source('', code);
        return parsedSource.toWordplay(getPreferredSpaces(parsedSource));
    }
    // Resolve a template reference from Performances, or use the literal code, then tidy it.
    let source = $derived(
        parsed === undefined
            ? ''
            : tidy(
                  typeof parsed.code === 'string'
                      ? parsed.code
                      : Performances[
                            parsed.code.name as keyof typeof Performances
                        ].apply(undefined, parsed.code.inputs as [string]),
              ),
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

    // The project to show: the persisted/edited project if loaded, else the initial one. Kept as a
    // component-scoped derived (not a block-scoped {@const}) so it isn't destroyed with the
    // {#key initialProject} block while ProjectView is still tearing down — which would otherwise
    // trigger Svelte's "reading a derived belonging to a now-destroyed effect" warning.
    let currentProject = $derived(project ?? initialProject);

    // Every time the progress changes, see if there's a revision to the project stored in the database,
    // and use that instead, and update the project store. Only editable performances are persisted:
    // display-only (fit/fix) performances have no editor, so a saved copy could only ever be stale —
    // and since tutorial projects are cloud-synced, a stale copy would override the current
    // performance even in a fresh/private session. Those always render the fresh initialProject.
    $effect(() => {
        const id = progress.getProjectID();
        if (!editable) {
            // Drop any project carried over from a previous (editable) step so currentProject
            // falls back to the fresh initialProject.
            project = undefined;
            return;
        }
        // Check asynchronously if there's a project for this tutorial project ID already.
        Projects.get(id).then((existingProject) => {
            // Ignore if we navigated away or this step became display-only meanwhile.
            if (progress.getProjectID() !== id || !editable) return;
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
    // after each edit of a project! Only for editable performances (see above).
    $effect(() => {
        if (!editable) return;
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

    /** The scene title in each non-primary chosen locale's tutorial (matched by parallel
     *  act/scene index), so the lesson <Options> can echo each chosen locale. */
    function sceneTitleEchoes(
        actIndex: number,
        sceneIndex: number,
        primaryText: string,
    ): { language: LanguageCode; direction: 'ltr' | 'rtl'; text: string }[] {
        const echoes: {
            language: LanguageCode;
            direction: 'ltr' | 'rtl';
            text: string;
        }[] = [];
        const seen = new Set([primaryText]);
        for (const tutorial of extraTutorials) {
            const scene = tutorial.acts[actIndex]?.scenes[sceneIndex];
            if (scene === undefined) continue;
            const text = withoutAnnotations(scene.subtitle ?? scene.title);
            if (text.length === 0 || seen.has(text)) continue;
            seen.add(text);
            echoes.push({
                language: tutorial.language,
                direction: getLanguageDirection(tutorial.language),
                text,
            });
        }
        return echoes;
    }

    /** The act title joined across chosen locales. A native <optgroup label> is a plain
     *  attribute that can't carry per-locale markup, so (unlike the scene options, which
     *  render styled echoes) the act header joins locales into one string. */
    function actTitleJoined(actIndex: number, primary: string): string {
        const seen = new Set([primary]);
        const parts = [primary];
        for (const tutorial of extraTutorials) {
            const title = tutorial.acts[actIndex]?.title;
            if (title === undefined) continue;
            const text = withoutAnnotations(title);
            if (text.length === 0 || seen.has(text)) continue;
            seen.add(text);
            parts.push(text);
        }
        return parts.join(MULTILINGUAL_SEPARATOR);
    }

    // Compute the options for the select based on the tutorial
    let lessons = $derived(
        progress.tutorial.acts.map((act, actIndex) => {
            return {
                label: actTitleJoined(actIndex, withoutAnnotations(act.title)),
                options: act.scenes.map((scene, sceneIndex) => {
                    const label = withoutAnnotations(
                        scene.subtitle ?? scene.title,
                    );
                    return {
                        value: JSON.stringify(
                            new Progress(
                                progress.tutorial,
                                actIndex + 1,
                                sceneIndex + 1,
                                0,
                            ).serialize(),
                        ),
                        label,
                        others: sceneTitleEchoes(actIndex, sceneIndex, label),
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
                // Preserve the active mode so navigation stays within this tutorial.
                progress.mode,
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
        // The non-primary *chosen* locales — not getLocales(), which appends the en-US
        // fallback and would echo English for a single non-English locale.
        const others = $locales.getPreferredLocales().slice(1);
        let cancelled = false;
        Promise.all(
            others.map((l) =>
                Locales.getTutorial(l.language, l.regions, progress.mode),
            ),
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
                progress.mode,
            ),
            label: target.label,
        }));
    });

    async function handleKey(event: KeyboardEvent) {
        // Ignore any modifiers; thhose are handled by the editor and project view.
        if (event.shiftKey || event.ctrlKey || event.altKey) return;

        if (event.key === 'ArrowLeft') {
            const previous = progress.previousPause() ?? progress;
            nav(previous);
            await tick();
            focusNav(previous, 'previous');
        } else if (event.key === 'ArrowRight' || event.key === ' ') {
            // At the tutorial's end there's no next step, so do nothing — consistent with the
            // inactive next button (previously this navigated away to the projects page).
            const next = progress.nextPause();
            if (next) {
                nav(next);
                await tick();
                focusNav(next, 'next');
            }
        }
    }
</script>

<!-- If the body gets focus, focus the instructions. -->
<svelte:body
    onfocus={(event) => {
        event.preventDefault();
        event.stopPropagation();
        tick().then(() => {
            // Prefer the last-focused nav button; otherwise the next button, or the previous one
            // when at the end (where next is inactive).
            const newFocus =
                focusView ??
                (progress.nextPause() !== undefined
                    ? nextButton
                    : previousButton);
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
    <PageHeaderRow header={(l) => l.ui.page.learn.header}>
        {#snippet breadcrumbControls()}
            <!-- Page-level navigation (tutorial mode + contrast language), inline with the breadcrumbs. -->
            <Mode
                modes={(l) => l.ui.page.learn.mode}
                choice={progress.mode === 'quick' ? 0 : 1}
                select={(choice) =>
                    switchMode(choice === 0 ? 'quick' : 'complete')}
                labeled={false}
            />
            {#if progress.mode === 'quick'}
                <Options
                    label={(l) => l.ui.page.learn.contrast}
                    value={$contrastLanguage}
                    change={(value) => {
                        if (value) Settings.setContrastLanguage(value);
                    }}
                    id="contrast-language"
                    options={contrastOptions}
                ></Options>
            {/if}
        {/snippet}
        {#snippet controls()}
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
                    >
                        {#snippet item(option, localized)}{@render localized(
                                option.label,
                            )}{#each option.others ?? [] as echo, i}<span
                                    class="option-echo"
                                    lang={echo.language}
                                    dir={echo.direction}
                                    style="font-size: {0.8 ** (i + 1)}em"
                                    >{echo.text}</span
                                >{/each}{/snippet}
                    </Options>
                    <TextField
                        id="tutorial-search"
                        placeholder={(l) => l.ui.page.learn.search.placeholder}
                        description={(l) => l.ui.page.learn.search.placeholder}
                        bind:text={searchQuery}
                    />
                </div>
            </nav>
        {/snippet}
    </PageHeaderRow>
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
                        {#if act !== undefined && scene !== undefined && dialog !== undefined && (scene.subtitle ?? scene.title)}<Note
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
                            ><LocalizedText path={(l) => l.glossary.act.word} />
                            {progress.act}<p
                                ><em
                                    ><LocalizedText
                                        overrideKey={actTitlePath(
                                            progress.mode,
                                            progress.act - 1,
                                        )}
                                        sourceText={act.title}
                                    /></em
                                ></p
                            ></div
                        >
                    {:else if dialog === undefined}
                        <div class="title scene"
                            ><LocalizedText
                                path={(l) => getConceptName(l, 'scene')}
                            />
                            {progress.scene}<p
                                ><em
                                    ><LocalizedText
                                        overrideKey={sceneTitlePath(
                                            progress.mode,
                                            progress.act - 1,
                                            progress.scene - 1,
                                        )}
                                        sourceText={scene.title}
                                    /></em
                                ></p
                            >{#if scene.subtitle}<em
                                    ><LocalizedText
                                        overrideKey={sceneSubtitlePath(
                                            progress.mode,
                                            progress.act - 1,
                                            progress.scene - 1,
                                        )}
                                        sourceText={scene.subtitle}
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
                                    eyes
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
                                                progress.mode,
                                                progress.act - 1,
                                                progress.scene - 1,
                                                turn.lineIndex,
                                            )}
                                            sourceText={turn.rawText}
                                        />{#each turn.others as echo, i}<div
                                                class="dialog-echo"
                                                lang={echo.language}
                                                dir={echo.direction}
                                                style="font-size: {0.8 **
                                                    (i + 1)}em"
                                                ><MarkupHTMLView
                                                    markup={echo.markup}
                                                /></div
                                            >{/each}
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
                    {#if currentProject}
                        <div class="project"
                            ><ProjectView
                                project={currentProject}
                                original={initialProject}
                                bind:index={projectContext}
                                bind:dragged
                                {showOutput}
                                {annotationsExpanded}
                                {fit}
                                autofocus={false}
                                guide={false}
                                warn={!editable}
                                shareable={false}
                                persistLayout={false}
                            /></div
                        >
                    {/if}
                {:else if currentProject}
                    <!-- Same sizing wrapper as ProjectView above, so the act-title output fills the
                         available space and doesn't collapse to zero height in the column (portrait)
                         layout, where there's no row to stretch it. -->
                    <div class="project">
                        <PlayView project={currentProject} {fit} />
                    </div>
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

    /* Keep the scene subtitle directly beneath its title rather than a full line
       below it (the title <p> otherwise carries a large default block-end margin). */
    .title.scene p {
        margin-block-end: 0.25em;
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
        border-inline-end: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-inline-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .dialog:focus {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    /* Echo of the same dialog line in an additional chosen locale: dimmed and (via an
       inline per-echo font-size) successively smaller than the primary. */
    .dialog-echo {
        opacity: 0.7;
        margin-block-start: var(--wordplay-spacing);
    }

    /* Echo of a lesson option's title in an additional chosen locale, shown on its own
       line beneath the primary, dimmed and smaller. */
    .option-echo {
        display: block;
        opacity: 0.7;
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
        text-align: start;
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        color: inherit;
        width: 100%;
    }

    .search-result:hover {
        background: var(--wordplay-hover);
        /* Keep nested links legible on the gold hover background (#1216). */
        --wordplay-link-color: var(--wordplay-foreground);
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
            border-inline-end: none;
            border-inline-start: none;
            border-top: var(--wordplay-border-width) solid
                var(--wordplay-border-color);
            border-bottom: var(--wordplay-border-width) solid
                var(--wordplay-border-color);
        }
    }
</style>
