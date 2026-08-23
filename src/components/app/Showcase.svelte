<!--
    The landing page's carousel of tiny example programs.

    This module is the landing page's only door to the language runtime — Project,
    Evaluator, and the output layer are ~2MB that a visitor reading the page should
    never download. It is reached exclusively through the dynamic import in
    showcase.ts, which is why `importGraph.test.ts` can still assert that the page
    itself reaches none of it. Nothing may import this statically from the page.

    Each example is a `\…\` example in the locale file whose first token is its own
    `¶doc¶`, so the explanation is documentation of the program rather than a
    caption beside it — and so translation carries the prose and the code together.
-->
<script lang="ts">
    import PlayView from '@components/app/PlayView.svelte';
    import { makeExampleProject } from '@components/concepts/previewEvaluator';
    import {
        getAnnouncer,
        getTip,
        setAnimatingNodes,
        setKeyboardEditIdle,
        setProject,
        setResetKeyboardIdle,
        setSelectedOutput,
    } from '@components/project/Contexts';
    import { IdleKind } from '@components/project/Contexts';
    import SelectedOutput from '@components/project/SelectedOutput.svelte';
    import RootView from '@components/project/RootView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import {
        getFocusableOption,
        getNextOption,
        isNavigationKey,
    } from '@components/widgets/optionNavigation';
    import { blocks, locales, Settings } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import Example from '@nodes/Example';
    import Markup from '@nodes/Markup';
    import type Program from '@nodes/Program';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import { BLOCK_EDITING_SYMBOL, TEXT_EDITING_SYMBOL } from '@parser/Symbols';
    import { withMonoEmoji } from '@unicode/emoji';
    import type Project from '@db/projects/Project';
    import type Node from '@nodes/Node';
    import { writable } from 'svelte/store';

    /** The examples, in the order their buttons appear. The icons live here
     *  rather than in the locale file because they are symbols, not words: a
     *  translator has nothing to do with them, and a "translated" emoji is a
     *  different picture. The same reason `Iconified` hard-codes route icons. */
    const Examples: {
        icon: string;
        text: (l: LocaleText) => string;
    }[] = [
        { icon: '💬', text: (l) => l.ui.page.landing.tour.example.phrase },
        { icon: '🎼', text: (l) => l.ui.page.landing.tour.example.music },
        { icon: '🕕', text: (l) => l.ui.page.landing.tour.example.hello },
        { icon: '⌨️', text: (l) => l.ui.page.landing.tour.example.keys },
        { icon: '🔘', text: (l) => l.ui.page.landing.tour.example.choose },
        { icon: '🖋️', text: (l) => l.ui.page.landing.tour.example.letters },
        { icon: '⚽', text: (l) => l.ui.page.landing.tour.example.pile },
        { icon: '🎤', text: (l) => l.ui.page.landing.tour.example.listen },
        { icon: '🙂', text: (l) => l.ui.page.landing.tour.example.smile },
    ];

    const indices = Examples.map((_, index) => index);

    let selected = $state(0);
    /** Bumped to rebuild the stage from scratch — switching examples, or the
     *  restart button. PlayView builds its evaluator once per mount, so a fresh
     *  mount is what a restart is. */
    let generation = $state(0);

    const announce = getAnnouncer();
    const id = $props.id();

    /** The app's own tooltip, rather than a `title`: a native tooltip doesn't
     *  follow the viewer's chosen locales, doesn't respect the hover/focus
     *  policy the rest of the app uses, and can't be read on a touch screen.
     *  Wired exactly as Tabbed wires its tabs. */
    const hint = getTip();

    /** One tooltip line per chosen locale, for the example at `index`. */
    function tipsFor(index: number) {
        return $locales.getMultilingualFrom(
            (l) => l.ui.page.landing.tour.examples,
            (text) => text.tips[index],
        );
    }
    function showTip(view: HTMLElement, index: number) {
        const entries = tipsFor(index);
        if (entries.length > 0) hint.showMultilingual(entries, view);
    }

    /** One description per example. It is the button's accessible name as well
     *  as its tooltip: the buttons are emoji, and each example explains itself
     *  in its own program doc, so a separate short label had nowhere to go. */
    const descriptions = $derived(
        Examples.map((_, index) =>
            $locales.getPrimaryPlainText(
                (l) => l.ui.page.landing.tour.examples.tips[index],
            ),
        ),
    );

    /**
     * Parse the selected locale string into the one Example node it holds. The
     * markup carries the spaces, which are significant in Wordplay (`ƒ sum(…)`
     * is not `ƒsum(…)`), so they travel with the program into both views.
     */
    const parsed = $derived.by(
        (): { program: Program; spaces: Spaces } | undefined => {
            // The example becomes code, so it must be the primary locale's text
            // alone and free of write-status markers — a `$~` prefix, or a join
            // of several locales, is not a program anyone could run.
            const text = $locales.getUnannotatedPrimaryText(
                Examples[selected].text,
            );
            const markup = Markup.words(text);
            const example = markup
                .nodes()
                .find((node): node is Example => node instanceof Example);
            return example === undefined
                ? undefined
                : {
                      program: example.program,
                      // Markup carries the spacing it was parsed with; falling
                      // back to preferred spacing matches what RootView does
                      // when a caller has none to give.
                      spaces:
                          markup.spaces ?? getPreferredSpaces(example.program),
                  };
        },
    );

    /** A real Project per example — the standard stage takes a project, not a
     *  markup node, and this is what gives it the permission splash, the music
     *  gate, the chat bar, and the music visualization. */
    const project = $derived(
        parsed === undefined
            ? undefined
            : makeExampleProject(
                  'tour',
                  parsed.program,
                  parsed.spaces,
                  $locales.getLocales(),
              ),
    );

    /**
     * The optional project-scoped contexts the stage and its output views read.
     * PlayView publishes only `evaluation`; its one other host happens to sit
     * inside a ProjectView, so running without these is untested territory.
     * Isolating them here is what OutputPreview does for the same reason.
     */
    const projectStore = writable<Project | undefined>(undefined);
    setProject(projectStore);
    setAnimatingNodes(writable<Set<Node>>(new Set()));
    setSelectedOutput(new SelectedOutput());
    setKeyboardEditIdle(writable(IdleKind.Idle));
    setResetKeyboardIdle(() => {});
    $effect(() => {
        projectStore.set(project);
    });

    let bar: HTMLElement | undefined = $state();
    const focusable = $derived(getFocusableOption(indices, selected));

    function choose(index: number) {
        if (index === selected) return;
        selected = index;
        generation += 1;
        // Naming the example is what makes this audible more than once: a
        // constant "example selected" is spoken once and never again.
        if (announce && $announce)
            $announce('tour', $locales.getLanguages()[0], descriptions[index]);
    }

    /** Arrow keys move within the group, which is a single tab stop — the same
     *  pattern Mode and Tabbed follow, using the same shared index math. */
    function handleKey(event: KeyboardEvent) {
        if (!isNavigationKey(event.key)) return;
        const next = getNextOption(
            indices,
            selected,
            event.key,
            $locales.getDirection() === 'rtl',
        );
        if (next === undefined) return;
        event.preventDefault();
        choose(next);
        bar?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus();
    }
</script>

<div class="showcase">
    <div class="controls">
        <!-- Round emoji buttons rather than a labeled tab bar: this is a
             carousel, and the formality of tabs fought the stage. The roles
             stay, though — it is exactly the tab pattern underneath, so arrow
             keys work and the panel is associated with what selected it. -->
        <div
            class="picker"
            role="tablist"
            aria-label={$locales.getPrimaryPlainText(
                (l) => l.ui.page.landing.tour.examples.label,
            )}
            bind:this={bar}
        >
            {#each Examples as option, index (index)}
                <button
                    type="button"
                    role="tab"
                    id="{id}-tab-{index}"
                    aria-controls="{id}-panel"
                    aria-selected={index === selected}
                    aria-label={descriptions[index]}
                    tabindex={index === focusable ? 0 : -1}
                    class:selected={index === selected}
                    onclick={() => choose(index)}
                    onkeydown={handleKey}
                    onpointerenter={(event) =>
                        canHoverTips()
                            ? showTip(event.currentTarget, index)
                            : undefined}
                    onpointerleave={() => hint.hide()}
                    onfocus={(event) =>
                        canFocusTips(event.currentTarget)
                            ? showTip(event.currentTarget, index)
                            : undefined}
                    onblur={() => hint.hide()}
                >
                    <span aria-hidden="true">{withMonoEmoji(option.icon)}</span>
                </button>
            {/each}
        </div>
    </div>
    <div
        class="panel"
        id="{id}-panel"
        role="tabpanel"
        aria-labelledby="{id}-tab-{selected}"
    >
        {#if parsed && project}
            <div class="output">
                <!-- Keyed so the stage is rebuilt for each example and for each
                     restart: PlayView constructs its evaluator once per mount.
                     `wheel={false}` because zooming preventDefaults, and this
                     page has to be able to scroll under the pointer. -->
                {#key generation}
                    <PlayView {project} wheel={false} />
                {/key}
                <!-- On the stage rather than beside the example buttons, where
                     it read as one more example. The stage's own `onretry` is
                     for a denied permission, not a restart, so starting an
                     example over is ours to offer; re-keying the view gives it
                     a fresh evaluator, which is what a restart is. -->
                <div class="restart">
                    <Button
                        background="circular"
                        tip={(l) => l.ui.page.landing.tour.restart}
                        action={() => {
                            generation += 1;
                        }}>↻</Button
                    >
                </div>
            </div>
            <div class="code">
                <!-- The code can be taller and wider than its box, and a
                     scrollable region a keyboard can't reach is unusable — so
                     it's a focusable, named group rather than a bare div, the
                     same unconditional treatment StartGate's scroller gets. The
                     name is the app's own word for a source file. Focusable
                     whether or not it currently overflows: measuring the
                     overflow instead would go stale on the next resize, or on
                     the next example. -->
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                    class="source"
                    role="group"
                    tabindex="0"
                    aria-label={$locales.getPrimaryPlainText(
                        (l) => l.ui.source.title,
                    )}
                >
                    <!-- Read-only, and following whatever mode the viewer has
                         chosen app-wide, so the page shows them the same editor
                         they'd get in a project. -->
                    <RootView
                        node={parsed.program}
                        spaces={parsed.spaces}
                        blocks={$blocks}
                        inert
                        wrap
                    />
                </div>
                <div class="mode">
                    <Mode
                        icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
                        modes={(l) => l.ui.dialog.settings.mode.blocks}
                        choice={$blocks ? 1 : 0}
                        select={(mode) => Settings.setBlocks(mode === 1)}
                        labeled={false}
                        modeLabels={false}
                    />
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .showcase {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: var(--wordplay-spacing-half);
        flex-shrink: 0;
    }

    .picker {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--wordplay-spacing-half);
    }

    .picker button {
        /* Comfortably past the 24px minimum target, and round like the dots of
           the carousels this borrows from. */
        inline-size: 2.2em;
        block-size: 2.2em;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: var(--wordplay-alternating-color);
        color: var(--wordplay-foreground);
        font-family: 'Noto Emoji';
        font-size: var(--wordplay-font-size);
        line-height: 1;
        cursor: pointer;
        transition: transform calc(var(--animation-factor) * 0.15s) ease-out;
    }

    .picker button:hover {
        transform: scale(1.1);
    }

    /* The selected one inverts rather than filling with the highlight color:
       the glyph is text as far as contrast is concerned, and the brand golds
       are background/highlight colors that only clear 3:1. Inverting is
       unambiguous in both schemes, and the ring keeps the mark legible for
       anyone who can't tell the two fills apart. */
    .picker button.selected {
        background: var(--wordplay-foreground);
        color: var(--wordplay-background);
        box-shadow: 0 0 0 calc(var(--wordplay-focus-width) / 2)
            var(--wordplay-highlight-color);
    }

    .picker button:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: 2px;
    }

    /* Over the stage's inline-end corner, where OutputPreview puts its own
       play control — clear of centered output, and clearly about the stage. */
    .restart {
        position: absolute;
        inset-block-start: var(--wordplay-spacing-half);
        inset-inline-end: var(--wordplay-spacing-half);
        z-index: 2;
    }

    .panel {
        display: flex;
        flex-direction: row-reverse;
        gap: var(--wordplay-spacing);
        flex: 1;
        min-height: 0;
        align-items: stretch;
    }

    /* The stage gets a box of its own. PlayView renders the output bare — in a
       project it's a tile with chrome around it — so without this the examples
       float in undifferentiated whitespace and nothing says where the stage
       ends. Same treatment the doc previews give it. */
    .output {
        /* Twice the code's share: the programs are short and the code column
           was running half-empty while the stage had no height to work with. */
        flex: 2;
        min-width: 0;
        min-height: 0;
        display: flex;
        position: relative;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        overflow: hidden;
    }

    .code {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--wordplay-spacing-half);
        flex: 1;
        min-width: 0;
        max-width: 34%;
        min-height: 0;
    }

    .source {
        /* Its own scroller, so a long line — and blocks mode, which is wider
           than text for the same program — can never widen the page. */
        overflow: auto;
        min-height: 0;
        max-width: 100%;
    }

    /* The toggle belongs to the code, so it sits on a rule under it rather than
       floating in the space below. */
    .mode {
        flex-shrink: 0;
        padding-block-start: var(--wordplay-spacing-half);
        border-block-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        width: 100%;
    }

    /* Below the split the code goes under the stage rather than beside it. Both
       get an explicit share of the height: left to `flex: 1` the stage took
       everything and the code was below the fold, which on a phone meant the
       code was never seen at all. */
    @container (max-width: 900px) {
        .panel {
            flex-direction: column;
        }

        /* The stage keeps a definite height — it has to, since output is drawn
           to fit a box — and the code takes as much room as it needs below it. */
        .output {
            flex: 0 0 auto;
            height: 18em;
        }

        .code {
            max-width: 100%;
            width: 100%;
            flex: 0 0 auto;
        }

        /* Only sideways here: vertically the code is as tall as it is, so
           nothing is hidden above the fold of a scroller within a scroller. */
        .source {
            overflow-x: auto;
            overflow-y: visible;
        }
    }
</style>
