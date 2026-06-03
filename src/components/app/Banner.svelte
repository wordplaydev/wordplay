<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import { animationDuration, appBanner, locales } from '@db/Database';
    import { slide } from 'svelte/transition';

    // App-wide transient banner, rendered once at the top of the layout. It
    // shows whatever message Database.reportBanner last set (e.g. "couldn't
    // delete that — try again"), which auto-dismisses. Kept visual-only: the
    // change-time announcement goes through the centralized Announcer rather
    // than a component-local aria-live region (see CLAUDE.md).
    const announce = getAnnouncer();

    // Announce each distinct new message once. Tracking the last announced value
    // avoids re-announcing on unrelated re-renders.
    let lastAnnounced: unknown = undefined;
    $effect(() => {
        const message = $appBanner;
        if (message === undefined) {
            lastAnnounced = undefined;
            return;
        }
        if (message === lastAnnounced) return;
        lastAnnounced = message;
        if (announce && $announce)
            $announce(
                'banner',
                $locales.getLanguages()[0],
                $locales.getUnannotatedText(message),
            );
    });
</script>

{#if $appBanner !== undefined}
    {@const message = $appBanner}
    <div
        class="banner"
        data-testid="app-banner"
        transition:slide={{ duration: $animationDuration }}
    >
        <span class="message"><LocalizedText path={message} markup={false} /></span
        ><Button
            tip={(l) => l.ui.update.dismiss}
            action={() => appBanner.set(undefined)}
            icon="✕"
        />
    </div>
{/if}

<style>
    /* Full-width strip at the very top of the layout, in normal flow so the
       page content shrinks to fit (the layout's .root is a flex column for
       exactly this). Error-colored to read as a problem the user should see. */
    .banner {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        flex-grow: 0;
        flex-shrink: 0;
    }

    .message {
        text-align: start;
    }
</style>
