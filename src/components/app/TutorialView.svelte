<script lang="ts">
    import Breadcrumbs from '@components/app/Breadcrumbs.svelte';
    import PageHeaderRow from '@components/app/PageHeaderRow.svelte';
    import PlayView from '@components/app/PlayView.svelte';
    import TutorialHighlight from '@components/app/TutorialHighlight.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import {
        getConceptPath,
        getAnnouncer,
        getUser,
        setConceptIndex,
        setConceptPath,
        setDragged,
        setProject,
        setTourRequest,
        type ConceptIndexContext,
        type TourRequest,
    } from '@components/project/Contexts';
    import ProjectView from '@components/project/ProjectView.svelte';
    import { isTourID, type TourID } from '@components/project/tours';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import type ConceptIndex from '@concepts/ConceptIndex';
    import {
        contrastLanguage,
        locales,
        Locales,
        Settings,
        toursTaken,
    } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import { moderatedFlags } from '@db/projects/Moderation';
    import Project from '@db/projects/Project';
    import { PersistenceType } from '@db/projects/ProjectHistory.svelte';
    import getConceptName from '@locale/getConceptName';
    import type LanguageCode from '@locale/LanguageCode';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import { MULTILINGUAL_SEPARATOR } from '@locale/Locales';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import ConceptLink, { TourName } from '@nodes/ConceptLink';
    import type Markup from '@nodes/Markup';
    import type Node from '@nodes/Node';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import { toMarkup } from '@parser/toMarkup';
    import { debounced } from '@util/debounce.svelte';
    import { localeGoto } from '@util/localeGoto';
    import { excerpt, searchItems } from '@util/search';
    import { onMount, tick, untrack } from 'svelte';
    import { get, writable } from 'svelte/store';
    import audio, { musicSuspended } from '@output/Music/MusicAudio';
    import BasisCharacters from '../../lore/BasisCharacters';
    import { Emotion } from '../../lore/Emotion';
    import { ContrastLanguages } from '../../tutorial/ContrastLanguage';
    import { performanceSource } from '../../tutorial/Performances';
    import { Themes, themeSource } from '../../tutorial/Themes';
    import Progress from '../../tutorial/Progress';
    import {
        parsePerformance,
        type Dialog,
        type Performance,
        type Tutorial,
    } from '../../tutorial/Tutorial';
    import {
        DEFAULT_TUTORIAL_MODE,
        type TutorialMode,
    } from '../../tutorial/TutorialMode';
    import {
        actTitlePath,
        dialogTextPath,
        sceneSubtitlePath,
        sceneTitlePath,
    } from '../../tutorial/TutorialPath';
    import { buildTutorialSearch } from '../../tutorial/tutorialSearch';

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
        // Browsers won't start audio without a user gesture, and this runs inside one. The
        // context is built when the first title card mounts, which is after the click that got
        // us there, so without this the theme stays silent until the viewer happens to click
        // again. Guarded on `musicSuspended`, which is false when no context exists: navigating
        // must never be the reason an AudioContext comes into being.
        if (get(musicSuspended)) void audio.resume();
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
    let skipButton: HTMLButtonElement | undefined = $state();
    let focusView: HTMLButtonElement | undefined = $state(undefined);

    /** Where focus belongs while a pause is waiting on a tour: the control that
     *  starts it. That control is written into the dialog's markup, so it is
     *  found by its uiid rather than bound — the same way everything else that
     *  points into rendered dialog finds its target. */
    function tourButton(): HTMLButtonElement | undefined {
        const view = document.querySelector('[data-uiid="tourLink"]');
        return view instanceof HTMLButtonElement ? view : skipButton;
    }

    /** Focus the navigation button the user is heading toward, falling back to the other when the
     * preferred one is inactive. At the tutorial's end the next button is inactive (aria-disabled,
     * but still focusable), so focusing it would leave focus on an inert control — there we focus
     * the previous button instead. `at` is the position to evaluate (the step being navigated to),
     * not necessarily the current prop, which may not have updated yet. */
    function focusNav(at: Progress, prefer: 'next' | 'previous') {
        // Waiting on a tour: the way forward is the tour, so focus that.
        if (prefer === 'next' && gated) {
            const target = tourButton();
            focusView = target;
            if (target)
                setKeyboardFocus(target, 'Tutorial focusing its pending tour');
            return;
        }
        const hasNext = at.nextPause() !== undefined && !gated;
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
        const noNext = progress.nextPause() === undefined || gated;
        const noPrevious = progress.previousPause() === undefined;
        untrack(() => {
            if (noNext && document.activeElement === nextButton)
                focusNav(progress, gated ? 'next' : 'previous');
            else if (noPrevious && document.activeElement === previousButton)
                focusNav(progress, 'next');
        });
    });

    /** The current place in the tutorial. Defaults to persisted progress, but overwritten by search parameters. */
    let act = $derived(progress.getAct());
    let scene = $derived(progress.getScene());
    let dialog = $derived(progress.getDialog());

    /** Announce newly revealed dialog through the centralized Announcer
     *  (rather than a local aria-live region, which trampled it — see
     *  CLAUDE.md). Mirrors what the dialog area shows: turn text at a pause,
     *  otherwise the act/scene title card. Initial content isn't announced,
     *  matching live-region semantics. */
    const announce = getAnnouncer();
    let lastAnnounced: string | undefined | null = null;
    $effect(() => {
        // One announcement per turn rather than one joined block: the live
        // region holds each announcement for a bounded time, so a long lesson
        // joined into a single string gets cut off partway. The queued lane
        // keeps them in order and never drops one.
        const parts: string[] =
            act === undefined
                ? []
                : scene === undefined
                  ? [act.title]
                  : dialog === undefined
                    ? [scene.subtitle ?? scene.title]
                    : turns.map((turn) => turn.speech.toText());
        const text = parts.join('\n');
        if (lastAnnounced === null) {
            lastAnnounced = text;
            return;
        }
        if (parts.length === 0 || text === lastAnnounced) return;
        lastAnnounced = text;
        if (announce && $announce)
            for (const part of parts)
                $announce('tutorial-dialog', $locales.getLanguages()[0], part);
    });

    /** This is bound to the project view's context */
    let dragged = $state<Node | undefined>();

    /** This is the tutorial's own dragged store, which we keep in a context */
    let localDragged = writable<Node | undefined>();
    setDragged(localDragged);

    /** The slot a `@Tour/<id>` in the dialog writes to. It lives here rather
     *  than in ProjectView because the dialog is a sibling of the project, not
     *  a descendant, so this is the nearest common ancestor of the thing that
     *  offers a tour and the thing that can run one. */
    const tourRequest: TourRequest = $state({ id: undefined });
    setTourRequest(tourRequest);

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

    /** The interface tours this pause hands the learner to, in the order they
     *  appear in the dialog. Derived the same way the UI highlights are: from
     *  the references in the markup, so a tour is offered by writing
     *  `@Tour/<id>` in the line that would otherwise have described the
     *  interface itself. */
    let pendingTours: TourID[] = $derived(
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
            .map((link) => ConceptLink.parse(link.getName()))
            .filter((parsed): parsed is TourName => parsed instanceof TourName)
            .map((parsed) => parsed.id)
            .filter((id) => isTourID(id)),
    );

    /** Whether this pause is waiting on a tour. The tutorial explains the
     *  interface by handing the learner to the tour that shows it, so it holds
     *  here until they've taken it — a tour taken anywhere, at any time, counts,
     *  and the skip control beside the next button is always available. */
    let gated = $derived(pendingTours.some((id) => !$toursTaken.includes(id)));

    /** Move on without taking the tours this pause offers. */
    function skipTours() {
        for (const id of pendingTours) Settings.markTourTaken(id);
    }

    /** When a tour releases the gate, take focus back. A tour opened with a
     *  pointer has nowhere to return focus to (Button's onpointerdown leaves it
     *  on the body), so without this a keyboard user would have to Tab back
     *  into the tutorial to continue the lesson they were just held in. */
    let wasGated = false;
    $effect(() => {
        const nowGated = gated;
        untrack(() => {
            if (
                wasGated &&
                !nowGated &&
                document.activeElement === document.body
            )
                focusNav(progress, 'next');
            wasGated = nowGated;
        });
    });

    /** Say why the arrow key or space bar didn't advance. Only the key path
     *  needs this: an inactive Button never runs its action, and a screen
     *  reader already reads the control itself as dimmed on the way to it. The
     *  interrupt lane is what lets a repeated refusal be heard more than once,
     *  since the reason is the same words every time. */
    function announceWait() {
        if (announce && $announce)
            $announce(
                'tutorial-tour',
                $locales.getLanguages()[0],
                $locales.getPrimaryPlainText((l) => l.ui.page.learn.tour.wait),
            );
    }

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
    // The title card's looping music, if this is a title card. Only act and scene performances
    // carry a theme, but `getPerformance()` keeps falling back to the scene's until a line's
    // performance takes over — so in the 17 scenes that open with dialog, the theme would
    // otherwise play on under the opening lines. A title card is exactly `pause === 0`, which is
    // also the only position with no dialog to talk over.
    let onTitleCard = $derived(progress.pause === 0);
    let theme = $derived(
        parsed?.theme !== undefined && onTitleCard
            ? themeSource(Themes[parsed.theme])
            : undefined,
    );
    // Resolve a template reference from Performances, or use the literal code, place the theme, then
    // tidy the result.
    let source = $derived(
        parsed === undefined ? '' : tidy(performanceSource(parsed.code, theme)),
    );

    /**
     * What actually distinguishes one step's project from another's: its id and its program.
     *
     * The `{#key}` below rebuilds the whole ProjectView — a ConceptIndex, an Evaluator, a full
     * evaluation, an Editor render — and it used to key on `initialProject`, which `Project.make`
     * returns fresh on every recomputation. So advancing rebuilt everything even when the step
     * showed the very same program as the one before, which is most pauses: Codependency has 43
     * pauses and only 17 distinct programs.
     */
    let projectKey = $derived(`${progress.getProjectID()}\n${source}`);

    // Every time the step's program changes, create an initial project for it.
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
    // {#key projectKey} block while ProjectView is still tearing down — which would otherwise
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

    /** The lesson option matching where we are, built exactly as the options are
     *  so the select actually shows the current scene. Act and scene are clamped
     *  to the first: the act-title and play-title pages sit before scene 1, which
     *  has no option of its own, and the scene they introduce is the right answer. */
    let currentLesson = $derived(
        JSON.stringify(
            new Progress(
                progress.tutorial,
                Math.max(1, progress.act),
                Math.max(1, progress.scene),
                0,
            ).serialize(),
        ),
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
            // Waiting on a tour: say so rather than doing nothing, since a key
            // that produces silence is indistinguishable from a broken app.
            if (gated) {
                event.preventDefault();
                announceWait();
                return;
            }
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
                (gated
                    ? tourButton()
                    : progress.nextPause() !== undefined
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

<!-- The section-level keydown implements tutorial-wide shortcuts (arrow
     navigation between lessons) by delegation; the section is a passive
     container whose interactive children carry their own semantics, so no
     role or tabindex belongs here. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<section class="tutorial" onkeydown={handleKey}>
    <!-- The breadcrumb trail sits beside the header rather than above it: every
         control that used to fill this row is now inside the tab panel, because
         each one acts on the chosen tutorial rather than on the page. -->
    <PageHeaderRow
        header={(l) => l.ui.page.learn.header}
        breadcrumbs={false}
        divider={false}
        packControls
    >
        {#snippet controls()}
            <Breadcrumbs />
        {/snippet}
    </PageHeaderRow>
    <!-- Which tutorial you're reading is a choice of content, so it reads as tabs
         over the lesson below rather than a control in the breadcrumb row. -->
    <Tabbed
        id="tutorial-mode"
        tabs={(l) => l.ui.page.learn.mode}
        choice={progress.mode === 'quick' ? 0 : 1}
        select={(choice) => switchMode(choice === 0 ? 'quick' : 'complete')}
    />
    <!-- The panel the tutorial tabs control. It stays a sibling rather than a
         child of Tabbed so the flex chain that sizes the dialog is unbroken. -->
    <div
        class="panel"
        id="tutorial-mode-panel"
        role="tabpanel"
        aria-labelledby="tutorial-mode-tab-{progress.mode === 'quick' ? 0 : 1}"
    >
        <!-- Where you are in the chosen tutorial, and the controls for moving
             around it. All of them read or change this tutorial specifically, so
             they belong inside its panel rather than in the page header. -->
        <nav class="lesson-controls">
            <!-- Tutorial lessons, grouped by act. The value is always line zero so
                 the current scene is what the closed select shows — which is why
                 there's no separate label naming the act beside it. Wide enough to
                 read a scene title, since it's the label for where you are. -->
            <Options
                label={(l) => l.ui.page.learn.options.lesson}
                value={currentLesson}
                change={handleSelect}
                id="current-lesson"
                options={lessons}
                width="14em"
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
            {#if act !== undefined}
                <Note
                    >{progress.tutorial.acts.findIndex(
                        (candidate) => candidate === act,
                    ) + 1}/{progress.tutorial.acts.length}</Note
                >{/if}
            <TextField
                id="tutorial-search"
                placeholder={(l) => l.ui.page.learn.search.placeholder}
                description={(l) => l.ui.page.learn.search.placeholder}
                bind:text={searchQuery}
            />
            <!-- The contrast language only means anything in the quick
                 tutorial, which compares Wordplay to a language you know. -->
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
        </nav>
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
                    <LocalizedText
                        path={(l) => l.ui.page.learn.search.noResults}
                    />
                {/if}
            </div>
        {:else}
            <div class="content">
                <div role="article" class="dialog">
                    <!-- The click is a pointer-only convenience that moves
                         focus to the Next button; keyboard users reach that
                         button directly with Tab, so a key handler here would
                         be redundant. -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div
                        class="turns"
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
                                action={() =>
                                    nav(progress.nextPause() ?? progress)}
                                active={progress.nextPause() !== undefined &&
                                    !gated}
                                icon="→"
                                bind:view={nextButton}
                            ></Button>
                        </div>
                        {#if act === undefined}
                            <div class="title play"
                                ><LocalizedText
                                    path={(l) => l.glossary.wordplay.word}
                                /></div
                            >
                        {:else if scene === undefined}
                            <div class="title act"
                                ><LocalizedText
                                    path={(l) => l.glossary.act.word}
                                />
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
                                        projectContext?.getConceptByName(
                                            character,
                                        )}
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
                            <!-- Beside the tour it offers, rather than up in the
                                 nav row: this is the choice being made here, and
                                 the nav row is a fixed three-part layout the
                                 narrow dialog column has no room to grow. -->
                            {#if gated}
                                <div class="skip">
                                    <Button
                                        tip={(l) => l.ui.page.learn.tour.skip}
                                        action={skipTours}
                                        bind:view={skipButton}
                                        ><LocalizedText
                                            path={(l) =>
                                                l.ui.page.learn.tour.skip}
                                        /></Button
                                    >
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
                <!-- Create a new view from scratch when the code changes -->
                <!-- Autofocus the main editor if it's currently focused -->
                {#key projectKey}
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
    </div>
</section>
{#key highlights}
    {#each highlights as highlight}
        <TutorialHighlight id={highlight} />
    {/each}
{/key}

<style>
    /* A quiet way past the tour: present, reachable, and not competing with the
       tour button it sits under. */
    .skip {
        display: flex;
        justify-content: flex-end;
        font-size: small;
        opacity: 0.8;
        margin-block-start: calc(var(--wordplay-spacing) / 2);
    }

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

    /* The panel the tabs control: a column so the lesson controls sit in a fixed
       row above the content, which takes the remaining height. Repeats .content's
       flex sizing so wrapping it in this panel doesn't collapse the dialog. */
    .panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        min-width: 0;
        width: 100%;
    }

    /* Where you are, and how to move around: one row that wraps on narrow
       viewports rather than growing to fill the panel. */
    .lesson-controls {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
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

    .controls {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
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
        /* Text and links on the gold, per --wordplay-hover-text in app.html:
           --wordplay-foreground is white in dark mode and measures 3.58:1 here,
           and the old --color-white link override measured 3.01:1 in light
           (#1216). The orange underline is what still marks a link. */
        color: var(--wordplay-hover-text);
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: var(--color-orange);
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
