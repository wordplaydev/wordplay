<script lang="ts">
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { animationDuration, locales } from '@db/Database';
    import { type Snippet } from 'svelte';
    import { slide } from 'svelte/transition';

    // The app-wide top-of-page banner. A presentational strip rendered once per
    // active message at the top of the layout (transient failures via
    // Database.reportBanner, the new-version notice via UpdateNotification). It
    // routes its change-time announcement through the centralized Announcer
    // rather than a component-local aria-live region (see CLAUDE.md).
    interface Props {
        /** The message to show. */
        message: LocaleTextAccessor;
        /** Color treatment. 'error' reads as a problem; 'info' is a neutral notice. */
        variant?: 'error' | 'info';
        /** When provided, a ✕ button is shown that calls this to dismiss. */
        dismiss?: (() => void) | undefined;
        /** Optional action buttons/links rendered after the message. */
        actions?: Snippet | undefined;
        /** Announce kind id, so distinct banners pace independently. */
        kind?: string;
    }

    let {
        message,
        variant = 'error',
        dismiss = undefined,
        actions = undefined,
        kind = 'banner',
    }: Props = $props();

    const announce = getAnnouncer();

    // Announce each distinct new message once. Tracking the last announced value
    // avoids re-announcing on unrelated re-renders.
    let lastAnnounced: unknown = undefined;
    $effect(() => {
        if (message === lastAnnounced) return;
        lastAnnounced = message;
        if (announce && $announce)
            $announce(
                kind,
                $locales.getLanguages()[0],
                $locales.getUnannotatedText(message),
            );
    });
</script>

<div
    class="banner {variant}"
    data-testid="app-banner"
    transition:slide={{ duration: $animationDuration }}
>
    <span class="message"><LocalizedText path={message} markup={false} /></span>
    {#if actions}<span class="actions">{@render actions()}</span>{/if}
    {#if dismiss}<Button
            tip={(l) => l.ui.update.dismiss}
            action={dismiss}
            icon="✕"
        />{/if}
</div>

<style>
    /* Full-width strip at the very top of the layout, in normal flow so the
       page content shrinks to fit (the layout's .root is a flex column for
       exactly this). */
    .banner {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        flex-grow: 0;
        flex-shrink: 0;
    }

    /* Error-colored to read as a problem the user should see. */
    .banner.error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }

    /* Neutral notice — standard colors with a bottom border to delineate it
       from the page content, so a routine message doesn't read as an error
       (mirrors EditorNotice's rationale). */
    .banner.info {
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .message {
        text-align: center;
    }

    .actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
