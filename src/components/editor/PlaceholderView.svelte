<script lang="ts">
    import { getMenuNode } from '../project/Contexts';
    import type { CaretPosition } from '../../edit/Caret';

    export let position: CaretPosition;

    const menuNode = getMenuNode();

    function show() {
        if (menuNode)
            menuNode.set($menuNode !== position ? position : undefined);
    }
</script>

<span
    class="trigger"
    role="button"
    tabindex="0"
    on:pointerdown|stopPropagation={show}
    on:keydown|stopPropagation={(event) =>
        event.key === 'Enter' || event.key === ' ' ? show() : undefined}>▼</span
>

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
