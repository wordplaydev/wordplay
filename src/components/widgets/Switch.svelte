<script lang="ts">
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        on: boolean;
        toggle: (on: boolean) => void;
        offLabel: string;
        onLabel: string;
        offTip: string;
        onTip: string;
        uiid?: string | undefined;
    }

    let {
        on,
        toggle,
        offLabel,
        onLabel,
        offTip,
        onTip,
        uiid = undefined,
    }: Props = $props();
</script>

<span class="switch" data-uiid={uiid} class:on>
    <span
        class={`button off ${on ? 'inactive' : 'active'}`}
        role="button"
        aria-disabled={!on}
        aria-label={offTip}
        tabindex="0"
        title={offTip}
        onclick={(event) => {
            event.stopPropagation();
            toggle(false);
        }}
        onkeydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(false)
                : undefined}>{withMonoEmoji(offLabel)}</span
    ><span
        class={`button on ${on ? 'active' : 'inactive'}`}
        role="button"
        aria-disabled={on}
        aria-label={onTip}
        tabindex="0"
        title={onTip}
        onclick={(event) => {
            event.stopPropagation();
            event.button === 0 ? toggle(true) : undefined;
        }}
        onkeydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(true)
                : undefined}
    >
        {withMonoEmoji(onLabel)}
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

    .button.inactive {
        transform: scale(1);
    }

    .button.inactive:hover {
        outline: none;
        transform: scale(1.1);
        transform-origin: center;
        z-index: 1;
        background: var(--wordplay-alternating-color);
    }

    .button.active {
        transform: scale(0.9);
        color: var(--wordplay-inactive-color);
        background-color: var(--wordplay-alternating-color);
        box-shadow: inset 1px 2px var(--wordplay-chrome);
    }

    .button:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }
</style>
