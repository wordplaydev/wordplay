<script lang="ts">
    import { getAnnouncer } from '@components/project/Contexts';
    import type { AnnouncementKind } from '@components/project/announcerQueue';
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
        /** Color treatment. 'error' reads as a problem; 'notice' is a
         * neutral announcement that shouldn't borrow the error hue. */
        variant?: 'error' | 'notice';
        /** When provided, a ✕ button is shown that calls this to dismiss. */
        dismiss?: (() => void) | undefined;
        /** Optional action buttons/links rendered after the message. */
        actions?: Snippet | undefined;
        /** Announcement kind: distinct banners get distinct priority lanes
         * (errors interrupt; the update notice queues). */
        kind?: AnnouncementKind;
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
                $locales.getPrimaryPlainText(message),
            );
    });
</script>

<div
    class="banner {variant}"
    class:saturated-surface={variant === 'error'}
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
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        flex-grow: 0;
        flex-shrink: 0;
        /* Both fills are solid colors the gold link color nearly vanishes
           against, so links take the strip's own text color and show their
           underline at rest — the .highlight-surface convention in app.html. */
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: currentColor;
    }

    /* Error-colored to read as a problem the user should see. The fill is a
       1.32:1 luminance match for the focus ring, so this variant also takes
       `saturated-surface` (app.html) to give controls a second band; the
       notice variant's chrome fill clears 3:1 on its own and doesn't. */
    .banner.error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }

    /* Neutral notice — the app's own chrome color, filled like the error
       banner so both read as the same kind of strip, but with no alarm hue:
       routine news shouldn't spend the color that means something is wrong,
       and when both strips are stacked they stay tellable apart. */
    .banner.notice {
        background: var(--wordplay-header);
        color: var(--wordplay-background);
    }

    /* Link sets `align-self: flex-start`, which pins it to the top of the row
       next to a taller button. Center it so the two labels line up. */
    .actions :global(a.link) {
        align-self: center;
    }

    /* Claim the leftover width so the actions and the dismiss button end up
       together at the end of the strip rather than at some arbitrary fraction
       of it. The basis lets a narrow screen wrap the actions onto their own
       line instead of squeezing the message into a column of words. */
    .message {
        flex: 1 1 12em;
        min-width: 0;
        text-align: start;
    }

    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
