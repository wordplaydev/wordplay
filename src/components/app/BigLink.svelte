<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
    export let subtitle: string | undefined = undefined;
    export let external = false;
    export let smaller = false;
</script>

<div class="biglink" class:smaller>
    <div class="link"><Link nowrap {to} {external}><slot /></Link></div>
    {#if subtitle}<div class="subtitle">{subtitle}</div>{/if}</div
>

<style>
    .biglink {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
    .link {
        font-size: min(6vw, 32pt);
    }

    .biglink.smaller .link {
        font-size: min(3vw, 24pt);
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: min(4vw, 16pt);
    }

    .smaller .subtitle {
        font-size: min(2vw, 14pt);
    }
</style>
