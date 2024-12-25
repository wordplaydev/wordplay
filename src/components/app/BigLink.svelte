<script lang="ts">
    import Link from './Link.svelte';

    interface Props {
        to: string;
        subtitle?: string | undefined;
        external?: boolean;
        smaller?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        subtitle = undefined,
        external = false,
        smaller = false,
        children,
    }: Props = $props();
</script>

<div class="biglink" class:smaller>
    <div class="link"
        ><Link nowrap {to} {external}>{@render children?.()}</Link></div
    >
    {#if subtitle}<div class="subtitle">{subtitle}</div>{/if}</div
>

<style>
    .biglink {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
    .link {
        font-size: min(24pt, max(18pt, 6vw));
    }

    .biglink.smaller .link {
        font-size: min(24pt, max(14pt, 3vw));
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: min(24pt, max(14pt, 4vw));
    }

    .smaller .subtitle {
        font-size: min(24pt, max(12pt, 2vw));
    }
</style>
