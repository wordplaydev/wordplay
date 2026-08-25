<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { withMonoEmoji } from '@unicode/emoji';

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

    let suffix = $derived(shortcut ? ` (${shortcut})` : '');
    // aria-labels are primary-locale-only, since screen readers speak them in
    // one voice; the visible hint renders each chosen locale stacked and styled.
    let onTipText = $derived($locales.getPrimaryPlainText(onTip) + suffix);
    let offTipText = $derived($locales.getPrimaryPlainText(offTip) + suffix);

    let hint = getTip();
    let localizing = getLocalizing();
    let offEditing = $state(false);
    let onEditing = $state(false);
    function showTip(view: HTMLSpanElement, tip: LocaleTextAccessor) {
        hint.showMarkup($locales.getMultilingualMarkup(tip), view);
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
        onpointerdown={(event) => event.preventDefault()}
        onclick={(event) => {
            event.stopPropagation();
            toggle(false);
        }}
        onpointerenter={(event) =>
            canHoverTips()
                ? showTip(event.target as HTMLSpanElement, offTip)
                : undefined}
        onpointerleave={hideTip}
        onfocus={(event) =>
            canFocusTips(event.currentTarget)
                ? showTip(event.target as HTMLSpanElement, offTip)
                : undefined}
        onblur={hideTip}
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
        onpointerdown={(event) => event.preventDefault()}
        onpointerenter={(event) =>
            canHoverTips()
                ? showTip(event.target as HTMLSpanElement, onTip)
                : undefined}
        onpointerleave={hideTip}
        onfocus={(event) =>
            canFocusTips(event.currentTarget)
                ? showTip(event.target as HTMLSpanElement, onTip)
                : undefined}
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
    {#if localizing?.on}{#if !onEditing}<LocalizedText
                path={offTip}
                tipIcon
                tipCorner="start"
                onEditingChange={(e) => (offEditing = e)}
            />{/if}{#if !offEditing}<LocalizedText
                path={onTip}
                tipIcon
                onEditingChange={(e) => (onEditing = e)}
            />{/if}{/if}
</span>

<style>
    .switch {
        display: flex;
        flex-direction: row;
        align-items: center;
        /* Anchors the two localization tip badges to the switch's corners. */
        position: relative;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    .button {
        display: inline-block;
        position: relative;
        transform-origin: center;
        cursor: pointer;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        background: var(--wordplay-background);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transition:
            transform calc(var(--animation-factor) * 100ms),
            box-shadow calc(var(--animation-factor) * 100ms);
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
        color: var(--wordplay-foreground);
        background-color: var(--wordplay-background);
    }

    .button.inactive:hover {
        background-color: var(--wordplay-hover);
        /* Text and links on the gold, per --wordplay-hover-text in app.html:
           --wordplay-foreground is white in dark mode and measures 3.58:1 here,
           and the old --color-white link override measured 3.01:1 in light
           (#1216). The orange underline is what still marks a link. */
        color: var(--wordplay-hover-text);
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: var(--color-orange);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
        z-index: 1;
    }

    .button.active {
        color: var(--wordplay-background);
        background: var(--wordplay-highlight-color);
        box-shadow: inset var(--wordplay-border-width)
            var(--wordplay-border-width) 0 var(--wordplay-foreground);
    }

    .button:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
        outline: none;
    }
</style>
