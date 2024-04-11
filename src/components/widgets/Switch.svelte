<script lang="ts">
    export let on: boolean;
    export let toggle: (on: boolean) => void;
    export let offLabel: string;
    export let onLabel: string;
    export let offTip: string;
    export let onTip: string;
    export let uiid: string | undefined = undefined;
</script>

<span class="switch" data-uiid={uiid} class:on>
    <span
        class={`button off ${on ? 'inactive' : 'active'}`}
        role="button"
        aria-disabled={!on}
        aria-label={offTip}
        tabindex={on ? 0 : null}
        title={offTip}
        on:click|stopPropagation={() => toggle(false)}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(false)
                : undefined}>{offLabel}</span
    ><span
        class={`button on ${on ? 'active' : 'inactive'}`}
        role="button"
        aria-disabled={on}
        aria-label={onTip}
        tabindex={on ? null : 0}
        title={onTip}
        on:click|stopPropagation={(event) =>
            event.button === 0 ? toggle(true) : undefined}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(true)
                : undefined}
    >
        {onLabel}
    </span>
</span>

<style>
    .switch {
        display: flex;
        flex-direction: row;
        align-items: center;
        user-select: none;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    .button {
        display: inline-block;
        position: relative;
        transform-origin: center;
        cursor: pointer;
        border-radius: var(--wordplay-border-radius);
        padding: calc(var(--wordplay-spacing) / 2);
        border: 1px solid var(--wordplay-chrome);
        background: var(--wordplay-background);
    }

    .button.off {
        transform-origin: right;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }

    .button.on {
        transform-origin: left;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .button {
        transition: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .on .divider {
        transform: translateX(1px);
    }

    .button.inactive:hover {
        outline: none;
        border-color: var(--wordplay-highlight-color);
        transform: scale(1);
        transform-origin: center;
        z-index: 1;
        background: var(--wordplay-alternating-color);
    }

    .button:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }

    .button.inactive {
        transform: scale(1);
    }

    .button.active {
        transform: scale(0.9);
        color: var(--wordplay-inactive-color);
        background-color: var(--wordplay-alternating-color);
        box-shadow: inset 1px 2px var(--wordplay-chrome);
    }
</style>
