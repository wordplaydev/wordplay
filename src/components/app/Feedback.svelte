<script lang="ts">
    export let inline = false;
</script>

{#if inline}<span class="feedback"><slot /></span>{:else}
    <p class="feedback"><slot /></p>{/if}

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

    p {
        font-size: large;
        text-align: center;
    }
</style>
