<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Translations from "../nodes/Translations";

    export let on: boolean;
    export let toggle: (on: boolean) => void;
    export let tip: Translations;
    export let offLabel: Translations;
    export let onLabel: Translations;

    let languages = getLanguages();

</script>

<span
    class="switch"
    title={tip[$languages[0]]}
>
    <span 
        class={`mode off ${on ? "inactive" : "active"}`}
        tabIndex=0 
        on:click={() => toggle(false)} 
        on:keydown={event => event.key === "Enter" || event.key === "Space" ? toggle(false) : undefined }    
    >
        {offLabel[$languages[0]]}
    </span><span 
        class={`mode on ${on ? "active" : "inactive"}`}
        tabIndex=0 
        on:click={() => toggle(true)} 
        on:keydown={event => event.key === "Enter" || event.key === "Space" ? toggle(true) : undefined }    
    >
        {onLabel[$languages[0]]}
    </span>
</span>

<style>
    .switch {
        background-color: var(--wordplay-chrome);
        display: inline-block;
        user-select: none;
    }

    .mode {
        display: inline-block;
        background-color: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        vertical-align: middle;
    }

    .mode:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }

    .mode.inactive:hover {
        cursor: pointer;
        background-color: var(--wordplay-border-color);
        border-color: var(--wordplay-highlight);
    }

    .mode.active {
        transform: translate(0px, 2px);
        background-color: var(--wordplay-background);
    }

    .off {
        border-right: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-top-left-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: var(--wordplay-border-radius);
    }

    .on {
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

</style>