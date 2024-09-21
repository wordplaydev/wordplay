<script lang="ts">
    import { getSetMenuNode } from '../project/Contexts';
    import type { CaretPosition } from '../../edit/Caret';

    export let position: CaretPosition;

    const menuNode = getSetMenuNode();

    function show() {
        if (menuNode) {
            $menuNode(position);
        }
    }
</script>

<span
    class="trigger"
    role="button"
    tabindex="0"
    on:pointerdown|stopPropagation={show}
    on:keydown|stopPropagation={(event) =>
        event.key === 'Enter' || event.key === ' ' ? show() : undefined}>▾</span
>

<style>
    .trigger {
        color: var(--wordplay-chrome);
        font-size: var(--wordplay-font-size);
        font-style: normal;
    }

    .trigger:hover,
    .trigger:focus {
        color: var(--wordplay-foreground);
        cursor: pointer;
    }

    .trigger:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }
</style>
