<script lang="ts">
    import Button from './Button.svelte';
    import { creator } from '../../db/Creator';

    export let prompt: string;
    export let decide: (yes: boolean) => void;
</script>

<div class="overlay" on:pointerdown|stopPropagation>
    <h1 class="prompt">{prompt}</h1>
    <div class="decisions"
        ><Button
            stretch
            tip={$creator.getLocale().ui.tooltip.no}
            action={() => decide(false)}>👎</Button
        ><Button
            stretch
            tip={$creator.getLocale().ui.tooltip.yes}
            action={() => decide(true)}>👍</Button
        ></div
    >
</div>

<style>
    .overlay {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: center;
        position: absolute;
        z-index: 4;
        background-color: var(--wordplay-background);
        opacity: 0.95;

        backdrop-filter: invert(100%) grayscale(50%) blur(1px);
        left: 0;
        top: 0;
    }

    .decisions {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        width: 100%;
        font-size: xxx-large;
        margin-block-end: auto;
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }

    .prompt {
        margin-block-start: auto;
        font-size: xxx-large;
    }
</style>
