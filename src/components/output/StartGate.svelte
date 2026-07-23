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
        mini?: boolean;
    }

    let { warnings, blocks, onstart, downloading, mini = false }: Props =
        $props();

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
                : hasUnmoderated
                  ? (l) => l.moderation.unmoderated.explanation
                  : undefined,
    );
</script>

<div class="start-gate" class:mini data-uiid="start-gate">
    <div class="card">
        <!-- Permission / moderation / photosensitivity section. -->
        {#if hasItems}
            <h2><LocalizedText path={header} /></h2>
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
            {#if !blocked}
                <Button
                    tip={(l) => l.ui.output.gate.start.tip}
                    action={() => onstart()}
                    background
                    testid="start-gate-start"
                >
                    <LocalizedText
                        path={(l) => l.ui.output.gate.start.label}
                    />
                </Button>
                {#if hasPermission}
                    <p class="note">
                        <LocalizedText
                            path={(l) => l.ui.output.permission.note}
                        />
                    </p>
                {/if}
            {/if}
        {/if}

        <!-- Model-download section, shown in parallel with the ask above (or on
             its own once the ask is acknowledged but a model is still loading). -->
        {#if downloading}
            <div class="download" class:standalone={!hasItems}>
                <!-- Standalone gets the big heading; alongside an ask it sits
                     under the button as a secondary "still getting ready" note. -->
                {#if hasItems}
                    <h3>
                        <LocalizedText
                            path={(l) => l.ui.output.download.title}
                        />
                    </h3>
                {:else}
                    <h2>
                        <LocalizedText
                            path={(l) => l.ui.output.download.title}
                        />
                    </h2>
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
                            .concretize((l) => l.ui.output.download.percent, {
                                percent,
                            })
                            ?.toText()}
                    </p>
                {/if}
                <p class="note">
                    <LocalizedText path={(l) => l.ui.output.download.note} />
                </p>
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
        padding: 1em;
    }

    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;
        max-width: 24em;
        text-align: center;
        /* Legible on any stage: set its own font + contrasting colors like
           <Notice>, rather than inheriting the output's (which can be white on
           a white splash background). */
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        padding: calc(2 * var(--wordplay-spacing));
        border-radius: var(--wordplay-border-radius);
    }

    h2 {
        margin: 0;
        font-size: 1.2em;
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
        background: color-mix(in srgb, var(--wordplay-background) 25%, transparent);
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

    .mini h2 {
        font-size: 1em;
    }

    .mini .card {
        gap: 0.5em;
    }

    .mini .note {
        display: none;
    }
</style>
