<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Translations from "../nodes/Translations";

    export let on: boolean;
    export let toggle: (on: boolean) => void;
    export let offLabel: Translations;
    export let onLabel: Translations;
    export let offTip: Translations;
    export let onTip: Translations;

    let languages = getLanguages();

</script>

<span
    class="switch"
>
    <span 
        class={`button off ${on ? "inactive" : "active"}`}
        tabIndex=0 
        title={offTip[$languages[0]]}
        on:click={() => toggle(false)} 
        on:keydown={event => event.key === "Enter" || event.key === "Space" ? toggle(false) : undefined }    
    >
        {offLabel[$languages[0]]}
    </span><span 
        class={`button on ${on ? "active" : "inactive"}`}
        tabIndex=0 
        title={onTip[$languages[0]]}
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
        font-family: var(--wordplay-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
    }

    .button {
        display: inline-block;
        position: relative;
        background-color: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        vertical-align: middle;
        transition: transform 0.25s;
        transform-origin: center;
    }

    .button:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
        transform: scale(1.1, 1.1);
    }

    .button:focus, .button.inactive {
        z-index: 2;
    }

    .button.inactive:hover {
        cursor: pointer;
        background-color: var(--wordplay-border-color);
        border-color: var(--wordplay-highlight);
        transform: scale(1.1, 1.1);
    }

    .button.active {
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