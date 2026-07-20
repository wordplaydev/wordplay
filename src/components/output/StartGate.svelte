<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
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
        mini?: boolean;
    }

    let { warnings, blocks, onstart, mini = false }: Props = $props();

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
                <LocalizedText path={(l) => l.ui.output.gate.start.label} />
            </Button>
            {#if hasPermission}
                <p class="note">
                    <LocalizedText path={(l) => l.ui.output.permission.note} />
                </p>
            {/if}
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
