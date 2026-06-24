<script lang="ts">
    import { updated } from '$app/state';
    import Banner from '@components/app/Banner.svelte';
    import Link from '@components/app/Link.svelte';
    import Button from '@components/widgets/Button.svelte';

    // SvelteKit's `updated.current` flips to true once it detects (via the
    // version poll configured in svelte.config.js, or on navigation) that the
    // deployed app version differs from the one this tab is running. Allow the
    // user to dismiss it for this session; it reappears if a newer version is
    // detected after a reload.
    let dismissed = $state(false);
</script>

{#if updated.current && !dismissed}
    <Banner
        message={(l) => l.ui.update.message}
        variant="info"
        kind="update"
        dismiss={() => (dismissed = true)}
    >
        {#snippet actions()}
            <Button
                tip={(l) => l.ui.update.refresh}
                label={(l) => l.ui.update.refresh}
                action={() => location.reload()}
                background
            />
            <Link to="/updates" reload label={(l) => l.ui.update.updates} />
        {/snippet}
    </Banner>
{/if}

<style>
    /* The Link anchor sets `align-self: flex-start`, which pins it to the top
       of the centered actions row next to the taller Refresh button. Center it
       so its text lines up with the button's label. */
    :global(.banner .actions a.link) {
        align-self: center;
    }
</style>
