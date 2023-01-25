<script lang="ts">
    export let on: boolean;
    export let toggle: (on: boolean) => void;
    export let offLabel: string;
    export let onLabel: string;
    export let offTip: string;
    export let onTip: string;
</script>

<span class="switch">
    <span
        class={`button off ${on ? 'inactive' : 'active'}`}
        tabIndex="0"
        title={offTip}
        on:click={() => toggle(false)}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(false)
                : undefined}>{offLabel}</span
    ><span
        class={`button on ${on ? 'active' : 'inactive'}`}
        tabIndex="0"
        title={onTip}
        on:click={() => toggle(true)}
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
        display: inline-block;
        user-select: none;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        color: currentColor;
    }

    .button {
        display: inline-block;
        position: relative;
        transition: transform 0.25s;
        transform-origin: center;
        cursor: pointer;
    }

    .off {
        margin-right: calc(var(--wordplay-spacing) / 2);
    }

    .on {
        margin-left: calc(var(--wordplay-spacing) / 2);
    }

    .button.inactive:focus,
    .button.inactive:hover {
        cursor: pointer;
        border-color: var(--wordplay-highlight);
        transform: scale(1.3);
        transform-origin: center;
        z-index: 1;
    }

    .button.inactive {
        transform: scale(1.2);
    }

    .button.active {
        transform: scale(1);
        color: var(--wordplay-disabled-color);
    }
</style>
