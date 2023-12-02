<script lang="ts">
    import { animationDuration } from '@db/Database';
    import { slide } from 'svelte/transition';

    export let inline = false;
</script>

{#if inline}<span class="feedback"><slot /></span>{:else}
    <p class="feedback" transition:slide={{ duration: $animationDuration }}
        ><slot /></p
    >{/if}

<style>
    .feedback {
        font-family: var(--wordplay-app-font);
        font-weight: normal;
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        margin-block-start: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        flex-grow: 0;
    }

    span {
        display: inline-block;
    }

    p {
        font-size: medium;
        text-align: center;
    }
</style>
