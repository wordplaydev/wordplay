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
    ><span class="divider" role="presentation" /><span
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
        gap: calc(var(--wordplay-spacing) / 4);
        user-select: none;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        color: currentColor;
    }

    .button {
        display: inline-block;
        position: relative;
        transform-origin: center;
        cursor: pointer;
    }

    .button.off {
        transform-origin: right;
    }

    .button.on {
        transform-origin: left;
    }

    .button {
        transition: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .divider {
        display: inline-block;
        transform: translateX(-1px);
        width: var(--wordplay-border-width);
        border-right: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        height: 1.5em;
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
    }

    .button:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }

    .button.inactive {
        transform: scale(1);
    }

    .button.active {
        transform: scale(0.8);
        color: var(--wordplay-inactive-color);
    }
</style>
