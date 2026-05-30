<script lang="ts">
    import { updated } from '$app/state';
    import Link from '@components/app/Link.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { animationDuration, locales } from '@db/Database';
    import { slide } from 'svelte/transition';

    // SvelteKit's `updated.current` flips to true once it detects (via the
    // version poll configured in svelte.config.js, or on navigation) that the
    // deployed app version differs from the one this tab is running. Allow the
    // user to dismiss it for this session; it reappears if a newer version is
    // detected after a reload.
    let dismissed = $state(false);
</script>

{#if updated.current && !dismissed}
    <div
        class="notification"
        role="status"
        aria-live="polite"
        aria-label={$locales.getUnannotatedText((l) => l.ui.update.label)}
        data-testid="update-notification"
        transition:slide={{ duration: $animationDuration }}
    >
        <div class="header">
            <LocalizedText path={(l) => l.ui.update.message} markup={false} />
            <Button
                tip={(l) => l.ui.update.dismiss}
                action={() => (dismissed = true)}
                icon="✕"
            />
        </div>
        <div class="actions">
            <Button
                tip={(l) => l.ui.update.refresh}
                label={(l) => l.ui.update.refresh}
                action={() => location.reload()}
                background
            />
            <Link to="/updates" reload label={(l) => l.ui.update.updates} />
        </div>
    </div>
{/if}

<style>
    /* Fixed, pinned to the top-right corner. Mirrors the elevated-panel look
       of OverflowToolbar's popup (background, border, radius, shadow) and sits
       at z-index 2 — above page/stage content but below the tooltip layer
       (Hint, z-index 3). Logical inset properties keep it corner-correct in
       RTL. */
    .notification {
        position: fixed;
        inset-block-start: var(--wordplay-spacing);
        inset-inline-end: var(--wordplay-spacing);
        z-index: 2;
        max-width: 20em;
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        box-shadow: 2px 2px 0 var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        color: var(--wordplay-foreground);
    }

    .header {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
    }

    .actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    /* The Link anchor sets `align-self: flex-start`, which pins it to the top
       of this centered row next to the taller Refresh button. Center it so its
       text lines up with the button's label. */
    .actions :global(a.link) {
        align-self: center;
    }
</style>
