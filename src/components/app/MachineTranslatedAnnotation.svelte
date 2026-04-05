<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import { MACHINE_TRANSLATED_SYMBOL } from '@parser/Symbols';
    import Emoji from './Emoji.svelte';

    let hint = getTip();
    let localize = getLocalizing();

    let annotation: HTMLSpanElement | undefined = undefined;

    let tip = $derived(
        $locales.getPlainText((l) => l.ui.template.machineTranslated),
    );

    function showTip() {
        if (annotation) hint.show(tip, annotation);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<Emoji color={false}
    ><span
        role="tooltip"
        bind:this={annotation}
        aria-label={tip}
        class:wiggle={localize.on}
        onfocus={showTip}
        onblur={hideTip}
        onpointerenter={showTip}
        onpointerleave={hideTip}>{MACHINE_TRANSLATED_SYMBOL}</span
    ></Emoji
>

<style>
    span {
        font-size: 8pt;
        cursor: help;
    }

    @keyframes wiggle {
        0%,
        100% {
            transform: rotate(0deg) scale(2);
        }
        25% {
            transform: rotate(-15deg) scale(1.8);
        }
        75% {
            transform: rotate(15deg) scale(2);
        }
    }

    .wiggle {
        display: inline-block;
        animation: wiggle 0.6s ease-in-out infinite;
        color: var(--wordplay-warning);
    }
</style>
