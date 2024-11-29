<script lang="ts">
    import { getSetMenuNode } from '../project/Contexts';
    import type { CaretPosition } from '../../edit/Caret';

    interface Props {
        position: CaretPosition;
    }

    let { position }: Props = $props();

    const menuNode = getSetMenuNode();

    function show(event: PointerEvent | KeyboardEvent) {
        event.stopPropagation();
        if (menuNode) {
            $menuNode(position);
        }
    }
</script>

<span
    class="trigger"
    role="button"
    tabindex="0"
    onpointerdown={show}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? show(event) : undefined}
    >▾</span
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
