<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import { MACHINE_TRANSLATED_SYMBOL } from '@parser/Symbols';
    import Emoji from './Emoji.svelte';

    let hint = getTip();

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
</style>
