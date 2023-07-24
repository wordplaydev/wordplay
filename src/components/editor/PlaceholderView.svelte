<script lang="ts">
    import type Node from '@nodes/Node';
    import { getCaret, getMenuNode } from '../project/Contexts';

    export let node: Node;

    const caret = getCaret();
    const menuNode = getMenuNode();

    function show() {
        if (menuNode && placeholder) menuNode?.set(placeholder);
    }

    const placeholder = $caret?.source.root
        .getAncestors(node)
        .find((n) => n.isPlaceholder());
</script>

{#if menuNode && placeholder && $caret?.isIn(placeholder, false)}
    <span
        class="trigger"
        role="button"
        tabindex="0"
        on:pointerdown|stopPropagation={show}
        on:keydown|stopPropagation={(event) =>
            event.key === 'Enter' || event.key === ' ' ? show() : undefined}
        >▾</span
    >
{/if}

<style>
    .trigger {
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-font-size);
    }

    .trigger:hover,
    .trigger:focus {
        color: var(--wordplay-foreground);
        cursor: pointer;
    }

    .trigger:focus {
        outline: none;
        color: var(--wordplay-highlight);
    }
</style>
