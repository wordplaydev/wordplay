<script lang="ts">
    /** Whether the header is in a list of blocks of text, and therefore should be offset to the inline start and have a block margin. */
    export let block = true;
</script>

<h1 class:block><slot /></h1>

<style>
    h1 {
        font-size: min(10vw, 60pt);
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-header);
        margin-block-end: 0;
        font-weight: bold;
        text-align: start;
        transform: rotate(-1deg);
        white-space: nowrap;
    }

    .block {
        margin-inline-start: -0.5rem;
        margin-block-end: calc(var(--wordplay-spacing) / 3);
    }
</style>
