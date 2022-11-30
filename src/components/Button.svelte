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
        background-color: var(--wordplay-border-color);
        font-family: var(--wordplay-font-face);
        font-weight: var(--wordplay-font-weight);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
    }

    button:focus {
        outline: var(--wordplay-highlight);
        outline-width: var(--wordplay-border-width);
    }

    button:hover {
        cursor: pointer;
        background-color: var(--wordplay-chrome);
    }

</style>