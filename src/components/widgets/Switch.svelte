<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        on: boolean;
        toggle: (on: boolean) => void;
        offLabel: string;
        onLabel: string;
        offTip: LocaleTextAccessor;
        onTip: LocaleTextAccessor;
        uiid?: string | undefined;
        shortcut: string | undefined;
    }

    let {
        on,
        toggle,
        offLabel,
        onLabel,
        offTip,
        onTip,
        uiid = undefined,
        shortcut,
    }: Props = $props();

    let onTipText = $derived($locales.get(onTip));
    let offTipText = $derived($locales.get(offTip));

    let hint = getTip();
    function showTip(view: HTMLSpanElement, tip: string) {
        hint.show(tip + (shortcut ? ` (${shortcut})` : ''), view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<span class="switch" data-uiid={uiid} class:on>
    <span
        class={`button off ${on ? 'inactive' : 'active'}`}
        role="button"
        aria-disabled={!on}
        aria-label={offTipText}
        tabindex="0"
        onclick={(event) => {
            event.stopPropagation();
            toggle(false);
        }}
        onpointerenter={(event) =>
            showTip(event.target as HTMLSpanElement, offTipText)}
        onpointerleave={hideTip}
        onfocus={(event) =>
            showTip(event.target as HTMLSpanElement, offTipText)}
        onblur={hideTip}
        ontouchstart={(event) =>
            showTip(event.target as HTMLSpanElement, offTipText)}
        ontouchend={hideTip}
        ontouchcancel={hideTip}
        onkeydown={(event) =>
            event.key === 'Enter' || event.key === ' '
                ? toggle(false)
                : undefined}>{withMonoEmoji(offLabel)}</span
    ><span
        class={`button on ${on ? 'active' : 'inactive'}`}
        role="button"
        aria-disabled={on}
        aria-label={onTipText}
        tabindex="0"
        onpointerenter={(event) =>
            showTip(event.target as HTMLSpanElement, onTipText)}
        onpointerleave={hideTip}
        onfocus={(event) => showTip(event.target as HTMLSpanElement, onTipText)}
        onblur={hideTip}
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
        padding: var(--wordplay-spacing-half);
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
        transition-duration: calc(var(--animation-factor) * 100ms);
    }

    .on .divider {
        transform: translateX(1px);
    }

    .button.inactive {
        transform: scale(1);
        color: var(--wordplay-foreground);
        background-color: var(--wordplay-background);
    }

    .button.inactive:hover {
        transform: scale(1.05);
        transform-origin: center;
        z-index: 1;
        background-color: var(--wordplay-hover);
    }

    .button.active {
        transform: scale(1.1);
        color: var(--wordplay-background);
        background: var(--wordplay-highlight-color);
    }

    .button:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
    }
</style>
