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

<div class="adjust">
    <Button
        tip={$creator.getLocale().ui.tooltip.increment}
        action={() => adjust(1)}><span class="arrow">⏶</span></Button
    >
    <Button
        tip={$creator.getLocale().ui.tooltip.decrement}
        action={() => adjust(-1)}><span class="arrow">⏷</span></Button
    >
</div>

<style>
    .adjust {
        display: inline-flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-inline-start: calc(var(--wordplay-spacing) / 2);
        vertical-align: middle;
    }

    .arrow {
        display: inline-block;
        line-height: 0%;
        height: 0.25em;
    }
</style>
