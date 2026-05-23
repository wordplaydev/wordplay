<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import {
        animationDuration,
        disconnected,
        firebaseReachable,
        locales,
        onlineStatus,
    } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { slide } from 'svelte/transition';

    // Pick the message reactively. Component only renders when $disconnected,
    // so at least one of these branches will fire.
    const path: LocaleTextAccessor | undefined = $derived(
        !$onlineStatus
            ? (l) => l.ui.connection.offline
            : !$firebaseReachable
              ? (l) => l.ui.connection.unreachable
              : undefined,
    );
</script>

{#if $disconnected && path !== undefined}
    <div
        class="banner"
        role="status"
        aria-live="assertive"
        aria-label={$locales.getUnannotatedText((l) => l.ui.connection.label)}
        data-testid="connection-banner"
        transition:slide={{ duration: $animationDuration }}
    >
        <LocalizedText {path} markup={false} />
    </div>
{/if}

<style>
    .banner {
        flex-shrink: 0;
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        font-family: var(--wordplay-app-font);
        text-align: center;
        padding: var(--wordplay-spacing);
        border-block-end: var(--wordplay-border-width) solid
            var(--wordplay-background);
    }
</style>
