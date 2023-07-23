<script lang="ts">
    import type Node from '@nodes/Node';
    import Button from '../widgets/Button.svelte';
    import { creator } from '../../db/Creator';
    import { IdleKind, getCaret, getEditor } from '../project/Contexts';
    import { tick } from 'svelte';

    export let node: Node;
    export let bounds: { left: number; top: number } | undefined;

    let viewUp: HTMLButtonElement | undefined = undefined;
    let viewDown: HTMLButtonElement | undefined = undefined;

    const caret = getCaret();
    const editor = getEditor();

    async function adjust(direction: -1 | 1) {
        const focus =
            viewUp === document.activeElement
                ? 1
                : viewDown === document.activeElement
                ? -1
                : 0;

        $editor($caret?.adjustLiteral(node, direction), IdleKind.Typing);

        await tick();
        if (focus === 1) viewUp?.focus();
        else if (focus === -1) viewDown?.focus();
    }
</script>

<div
    class="adjust"
    style:left={bounds ? `${bounds.left}px` : null}
    style:top={bounds ? `${bounds.top}px` : null}
>
    <Button
        tip={$creator.getLocale().ui.tooltip.increment}
        bind:view={viewUp}
        action={() => adjust(1)}><span class="arrow">⏶</span></Button
    >
    <Button
        tip={$creator.getLocale().ui.tooltip.decrement}
        bind:view={viewDown}
        action={() => adjust(-1)}><span class="arrow">⏷</span></Button
    >
</div>

<style>
    .adjust {
        position: absolute;
        display: inline-flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-inline-start: var(--wordplay-spacing);
        margin-block-start: calc(var(--wordplay-spacing) / 2);
    }

    .arrow {
        display: inline-block;
        line-height: 0%;
        height: 0.25em;
    }
</style>
