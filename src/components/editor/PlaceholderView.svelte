<script lang="ts">
    import type Node from '@nodes/Node';
    import { getMenuNode } from '../project/Contexts';

    export let node: Node;

    const menuNode = getMenuNode();

    function show() {
        menuNode?.set(node);
    }
</script>

{#if menuNode}
    <span
        class="trigger"
        role="button"
        tabindex="0"
        on:pointerdown|stopPropagation={show}
        on:keydown={(event) =>
            event.key === 'Enter' || event.key === ' ' ? show() : undefined}
        >▾</span
    >
{/if}

<style>
    .trigger {
        color: var(--wordplay-disabled-color);
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
