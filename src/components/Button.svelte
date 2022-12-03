<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Translations from "../nodes/Translations";

    export let label: Translations;
    export let tip: Translations;
    export let action: () => void;
    export let enabled: boolean = true;

    let languages = getLanguages();

</script>

<button 
    title={tip[$languages[0]]} 
    tabIndex={0} 
    on:click={action} 
    disabled={!enabled}
    on:keydown={event => event.key === "Enter" || event.key === "Space" ? action() : undefined}
>
    {label[$languages[0]]}
</button>

<style>
    button {
        display: inline-block;
        background-color: var(--wordplay-chrome);
        font-family: var(--wordplay-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        transition: transform 0.25s;
        transform-origin: center;
    }

    button:focus {
        outline: var(--wordplay-highlight);
        outline-width: var(--wordplay-border-width);
    }

    button:hover:not(:disabled) {
        cursor: pointer;
        background-color: var(--wordplay-border-color);
        border-color: var(--wordplay-highlight);        
        transform: scale(1.1, 1.1);
        z-index: 2;
    }

    button:disabled {
        cursor: default;
        background-color: var(--wordplay-disabled-color);
        opacity: 0.8;
    }

</style>