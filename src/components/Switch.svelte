<script lang="ts">
    import { languages } from "../models/languages";
    import type Translations from "../nodes/Translations";

    export let on: boolean;
    export let toggle: (on: boolean) => void;
    export let offLabel: Translations;
    export let onLabel: Translations;
    export let offTip: Translations;
    export let onTip: Translations;

</script>

<span
    class="switch"
>
    <span 
        class={`button off ${on ? "inactive" : "active"}`}
        tabIndex=0 
        title={offTip[$languages[0]]}
        on:click={() => toggle(false)} 
        on:keydown={event => event.key === "Enter" || event.key === " " ? toggle(false) : undefined }    
    >
        {offLabel[$languages[0]]}
    </span><span 
        class={`button on ${on ? "active" : "inactive"}`}
        tabIndex=0 
        title={onTip[$languages[0]]}
        on:click={() => toggle(true)} 
        on:keydown={event => event.key === "Enter" || event.key === " " ? toggle(true) : undefined }    
    >
        {onLabel[$languages[0]]}
    </span>
</span>

<style>
    .switch {
        display: inline-block;
        user-select: none;
        font-family: var(--wordplay-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    .button {
        display: inline-block;
        position: relative;
        background-color: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        transition: transform 0.25s;
        transform-origin: center;
    }

    .button:first-child {
        border-right: none;
    }

    .button:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        transform: scale(1.15, 1.15);
    }

    .button:focus, .button.inactive {
        z-index: 2;
    }

    .button:focus.active {
        z-index: 3;
    }

    .button.inactive:hover {
        cursor: pointer;
        border-color: var(--wordplay-highlight);
        transform: scale(1.15, 1.15);
    }

    .button.inactive {
        transform: scale(1, 1);
    }

    .button.active {
        transform: scale(1);
        background-color: var(--wordplay-disabled-color);
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