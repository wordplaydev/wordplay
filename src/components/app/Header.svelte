<script lang="ts">
    import TiltedHeader from './Tilted.svelte';

    /** Whether the header is in a list of blocks of text, and therefore should be offset to the inline start and have a block margin. */
    export let block = true;
    export let wrap = false;
</script>

<h1 class:block class:wrap
    ><TiltedHeader capitalized={false}><slot /></TiltedHeader></h1
>

<style>
    h1 {
        font-size: min(10vw, 60pt);
        margin-bottom: 0;
        flex-shrink: 0;
    }

    .wrap {
        word-break: break-all;
    }

    .block {
        margin-inline-start: -0.5rem;
        margin-block-end: calc(var(--wordplay-spacing) / 3);
    }
</style>
