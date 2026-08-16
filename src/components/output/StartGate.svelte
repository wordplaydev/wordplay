<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { withMonoEmoji } from '@unicode/emoji';
    import {
        gateItemDescription,
        gateItemEmoji,
        gateItemKey,
        type GateBlock,
        type GateWarning,
    } from './gate';

    interface Props {
        /** Reasons the viewer can acknowledge by clicking Start. */
        warnings: GateWarning[];
        /** Reasons that block the content entirely (no way to continue). */
        blocks: GateBlock[];
        /** Called when the viewer clicks Start: grant consent + acknowledge. */
        onstart: () => void;
        /** When set, the gate shows a model-download screen instead of the
         *  warnings + Start button: the labels of the models still downloading,
         *  and their aggregate progress (undefined = indeterminate). */
        downloading?:
            | {
                  models: LocaleTextAccessor[];
                  progress: number | undefined;
              }
            | undefined;
    }

    let { warnings, blocks, onstart, downloading }: Props = $props();

    /** Names the scrolling body via the card's single heading. */
    const uid = $props.id();

    let percent = $derived(
        downloading?.progress === undefined
            ? undefined
            : Math.round(downloading.progress * 100),
    );

    let blocked = $derived(blocks.length > 0);
    let hasPhoto = $derived(
        warnings.some((warning) => warning.kind === 'photosensitivity'),
    );
    // A moderator's warn flag vs merely-unmoderated content — different headers.
    let hasWarning = $derived(
        warnings.some((w) => w.kind === 'moderation' && w.moderated),
    );
    let hasUnmoderated = $derived(
        warnings.some((w) => w.kind === 'moderation' && !w.moderated),
    );
    let hasMusic = $derived(
        warnings.some((warning) => warning.kind === 'music'),
    );
    let hasPermission = $derived(
        warnings.some((warning) => warning.kind === 'permission'),
    );

    // Blocks dominate the display, since the viewer can't proceed past them.
    let items = $derived<(GateWarning | GateBlock)[]>(
        blocked ? blocks : warnings,
    );
    // Whether there's a permission/moderation/photo ask to render at all (vs. a
    // pure model-download screen).
    let hasItems = $derived(items.length > 0);

    // Header/explanation come from the highest-priority reason present.
    let header = $derived<LocaleTextAccessor>(
        blocked
            ? (l) => l.moderation.blocked.header
            : hasWarning
              ? (l) => l.moderation.warning.header
              : hasPhoto
                ? (l) => l.photosensitivity.warning.header
                : hasMusic
                  ? (l) => l.musicsafety.warning.header
                  : hasUnmoderated
                    ? (l) => l.moderation.unmoderated.header
                    : (l) => l.ui.output.permission.title,
    );
    let explanation = $derived<LocaleTextsAccessor | undefined>(
        blocked
            ? (l) => l.moderation.blocked.explanation
            : hasWarning
              ? (l) => l.moderation.warning.explanation
              : hasPhoto
                ? (l) => l.photosensitivity.warning.explanation
                : hasMusic
                  ? (l) => l.musicsafety.warning.explanation
                  : hasUnmoderated
                    ? (l) => l.moderation.unmoderated.explanation
                    : undefined,
    );
</script>

<div class="start-gate" data-uiid="start-gate">
    <div class="card">
        <!-- Pinned above the scroll: in a small preview the reason for the gate
             is the one thing that must be readable without scrolling. Exactly
             one heading carries the id in every renderable state, so the body's
             aria-labelledby below never dangles. -->
        {#if hasItems}
            <h2 id="{uid}-header"><LocalizedText path={header} /></h2>
        {:else if downloading}
            <h2 id="{uid}-header">
                <LocalizedText path={(l) => l.ui.output.download.title} />
            </h2>
        {/if}

        <!-- The scrolling region, so a gate over a small output view (a guide
             example is ~240x180) shrinks and scrolls rather than clipping.
             Focusable unconditionally: when it scrolls it may hold no focusable
             content at all (a blocked gate has no Start button), which fails
             WCAG 2.1.1 and axe's scrollable-region-focusable; measuring the
             overflow instead would go stale on the next resize. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            class="body"
            role="group"
            tabindex="0"
            aria-labelledby="{uid}-header"
        >
            <!-- Permission / moderation / photosensitivity section. -->
            {#if hasItems}
                {#if explanation}
                    <div class="explanation">
                        <MarkupHTMLView markup={explanation} />
                    </div>
                {/if}
                <ul>
                    {#each items as item (gateItemKey(item))}
                        <li>
                            <span class="emoji" aria-hidden="true"
                                >{withMonoEmoji(gateItemEmoji(item))}</span
                            >
                            <span
                                ><MarkupHTMLView
                                    inline
                                    markup={gateItemDescription(item)}
                                /></span
                            >
                        </li>
                    {/each}
                </ul>
            {/if}

            <!-- Model-download section, shown in parallel with the ask above (or
                 on its own once the ask is acknowledged but a model is still
                 loading). Standalone, its heading is the card's above. -->
            {#if downloading}
                <div class="download" class:standalone={!hasItems}>
                    {#if hasItems}
                        <!-- Alongside an ask it's a secondary "still getting
                             ready" note, so it gets the smaller heading. -->
                        <h3>
                            <LocalizedText
                                path={(l) => l.ui.output.download.title}
                            />
                        </h3>
                    {/if}
                    <ul>
                        {#each downloading.models as model (model)}
                            <li>
                                <span class="emoji" aria-hidden="true"
                                    >{withMonoEmoji('📦')}</span
                                >
                                <span><LocalizedText path={model} /></span>
                            </li>
                        {/each}
                    </ul>
                    <div
                        class="progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                    >
                        <div
                            class="bar"
                            class:indeterminate={percent === undefined}
                            style:width={percent === undefined
                                ? '100%'
                                : `${percent}%`}
                        ></div>
                    </div>
                    {#if percent !== undefined}
                        <p class="note">
                            {$locales
                                .concretize(
                                    (l) => l.ui.output.download.percent,
                                    { percent },
                                )
                                ?.toText()}
                        </p>
                    {/if}
                    <p class="note">
                        <LocalizedText
                            path={(l) => l.ui.output.download.note}
                        />
                    </p>
                </div>
            {/if}
        </div>

        <!-- Pinned below the scroll, so the way out of the gate is reachable at
             any output size. -->
        {#if hasItems && !blocked}
            <div class="actions">
                <Button
                    tip={(l) => l.ui.output.gate.start.tip}
                    action={() => onstart()}
                    background
                    testid="start-gate-start"
                >
                    <LocalizedText path={(l) => l.ui.output.gate.start.label} />
                </Button>
                {#if hasPermission}
                    <p class="note">
                        <LocalizedText
                            path={(l) => l.ui.output.permission.note}
                        />
                    </p>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .start-gate {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--wordplay-background);
        z-index: 2;
        /* A small absolute inset: a ~180px-tall guide preview can't spare 1em a
           side. It can't be container-relative either — cq units *on* a query
           container resolve against its nearest ANCESTOR container, which
           differs between hosts (OutputView's .value vs. the guide's chain). */
        padding: var(--wordplay-spacing);
        /* Both dimensions are definite (inset: 0 against a positioned
           ancestor), so size containment can't cycle. This lets the card below
           scale to whichever dimension is scarcer — height, in a 4:3 preview. */
        container-type: size;
    }

    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
        /* In font-size, `em` resolves against the parent (the app font, since
           nothing between here and the body sets one) while cqmin resolves
           against .start-gate's content box. So any gate at least ~320px on its
           short side renders at 1em — full-size stages are unchanged — and a
           small preview shrinks to the floor, past which the body scrolls.
           Without container-type: size support the declaration is dropped and
           cqmin resolves against the viewport, which clamps to 1em. */
        font-size: clamp(0.75em, 5cqmin, 1em);
        max-width: 24em;
        /* Percentage of the flex container's content box, which is definite.
           Without it an over-tall card overflows symmetrically and its top is
           unreachable as well as its bottom. */
        max-height: 100%;
        /* Flex items default to a min-content minimum size, which a definite
           max-width only clamps — an unbreakable word would still push the card
           past a narrow gate. */
        min-width: 0;
        text-align: center;
        /* Legible on any stage: set its own font + contrasting colors like
           <Notice>, rather than inheriting the output's (which can be white on
           a white splash background). */
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        /* em, so it tracks the clamp above; identical to
           calc(2 * var(--wordplay-spacing)) at full size. */
        padding: 1em;
        border-radius: var(--wordplay-border-radius);
    }

    h2 {
        margin: 0;
        font-size: 1.2em;
        flex-shrink: 0;
    }

    .body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
        width: 100%;
        /* Column flex items default to a content-height minimum, which would
           hold the body open and push the actions out of the card. */
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        /* Don't chain the scroll into the page behind the output view. */
        overscroll-behavior: contain;
    }

    /* The global ring is :focus (not :focus-visible) in --color-blue, which is
       far under 3:1 against the card's error background. Use the card's own
       foreground, drawn inward so the card's padding can't clip it. */
    .body:focus {
        outline: none;
    }

    .body:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-background);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        border-radius: var(--wordplay-border-radius);
    }

    .actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5em;
        /* Never yields room to the scrolling body: this is the way out. */
        flex-shrink: 0;
    }

    .explanation {
        font-size: 0.95em;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }

    li {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-size: 1em;
        text-align: start;
    }

    .emoji {
        font-size: 1.4em;
        /* Force the monochrome emoji font first (mono-first, no color fallback)
           so the withMonoEmoji glyph renders mono in every browser; otherwise
           Safari falls through to the system color emoji. */
        font-family: var(--wordplay-emoji-mono-font);
    }

    .note {
        font-size: 0.85em;
        opacity: 0.7;
        margin: 0;
    }

    /* When shown under a permission ask, separate the download block with a
       divider and dim its heading so the primary ask stays dominant. */
    .download {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
        width: 100%;
    }

    .download:not(.standalone) {
        border-top: 1px solid
            color-mix(in srgb, var(--wordplay-background) 30%, transparent);
        padding-top: 1em;
    }

    .download h3 {
        margin: 0;
        font-size: 1em;
        font-weight: normal;
        opacity: 0.85;
    }

    .progress {
        width: 100%;
        height: 0.5em;
        border-radius: var(--wordplay-border-radius);
        /* The card is on --wordplay-error; use a translucent track/fill of the
           card's own foreground so it reads on that background. */
        background: color-mix(
            in srgb,
            var(--wordplay-background) 25%,
            transparent
        );
        overflow: hidden;
    }

    .bar {
        height: 100%;
        background: var(--wordplay-background);
        transition: width 0.2s linear;
    }

    /* Unknown total: sweep a partial fill back and forth instead of a fixed bar. */
    .bar.indeterminate {
        width: 40% !important;
        animation: indeterminate 1.2s ease-in-out infinite;
    }

    @keyframes indeterminate {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(250%);
        }
    }
</style>
