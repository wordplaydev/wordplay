<script lang="ts">
    export let inline = false;
</script>

{#if inline}<span class="feedback"><slot /></span>{:else}
    <h1 class="feedback"><slot /></h1>{/if}

<style>
    .feedback {
        font-family: var(--wordplay-app-font);
        font-weight: normal;
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
    }

    span {
        display: inline-block;
    }

    h1 {
        font-size: xx-large;
        margin-block-start: 2em;
        text-align: center;
    }
</style>
