<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import { locales } from '@db/Database';
    import { LOCALLY_REVISED_SYMBOL } from '@parser/Symbols';
    import Emoji from '@components/app/Emoji.svelte';

    let hint = getTip();
    let annotation: HTMLSpanElement | undefined = undefined;

    let tip = $derived(
        $locales.getPrimaryPlainText((l) => l.ui.template.locallyRevised),
    );

    function showTip() {
        if (annotation)
            hint.showMarkup(
                $locales.getMultilingualMarkup(
                    (l) => l.ui.template.locallyRevised,
                ),
                annotation,
            );
    }
    function hideTip() {
        hint.hide();
    }
</script>

<span
    role="tooltip"
    bind:this={annotation}
    aria-label={tip}
    onfocus={(event) =>
        canFocusTips(event.currentTarget) ? showTip() : undefined}
    onblur={hideTip}
    onpointerenter={() => (canHoverTips() ? showTip() : undefined)}
    onpointerleave={hideTip}
    ><Emoji text={LOCALLY_REVISED_SYMBOL} color={false} /></span
>

<style>
    span {
        font-size: 8pt;
        cursor: help;
    }
</style>
