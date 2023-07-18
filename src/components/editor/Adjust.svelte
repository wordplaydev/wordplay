<script lang="ts">
    import type Node from '@nodes/Node';
    import Button from '../widgets/Button.svelte';
    import { creator } from '../../db/Creator';
    import { IdleKind, getCaret, getEditor } from '../project/Contexts';

    export let node: Node;

    const caret = getCaret();
    const editor = getEditor();

    function adjust(direction: -1 | 1) {
        $editor($caret?.adjustLiteral(node, direction), IdleKind.Typing);
    }
</script>

<div>
    <Button
        tip={$creator.getLocale().ui.tooltip.increment}
        action={() => adjust(1)}>⏶</Button
    >
    <Button
        tip={$creator.getLocale().ui.tooltip.decrement}
        action={() => adjust(-1)}>⏷</Button
    >
</div>

<style>
    div {
        display: inline-flex;
        flex-direction: row;
        gap: calc(var(--wordplay-spacing) / 2);
    }
</style>
