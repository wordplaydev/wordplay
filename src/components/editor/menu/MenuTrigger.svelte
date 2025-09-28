<script module lang="ts">
    export type FieldPosition = { parent: Node; field: string };
</script>

<script lang="ts">
    import type Node from '@nodes/Node';
    import Source from '@nodes/Source';
    import { DROP_DOWN_SYMBOL } from '@parser/Symbols';
    import type { CaretPosition } from '../../../edit/Caret';
    import { getRoot, getSetMenuNode } from '../../project/Contexts';

    interface Props {
        position: CaretPosition | FieldPosition;
    }

    let { position }: Props = $props();

    const menuNode = getSetMenuNode();
    const root = getRoot();

    function resolvePosition(pos: FieldPosition): CaretPosition | undefined {
        const { parent, field } = pos;
        if (root.root?.root instanceof Source)
            return root.root.root.getFieldPosition(parent, field);
        else return undefined;
    }

    function show(event: PointerEvent | KeyboardEvent) {
        event.stopPropagation();
        const anchor =
            typeof position === 'object' &&
            position !== null &&
            'parent' in position &&
            'field' in position
                ? resolvePosition(position)
                : position;
        if (menuNode && anchor) $menuNode(anchor);
    }
</script>

<span
    class="trigger"
    role="button"
    tabindex="0"
    onpointerdown={show}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? show(event) : undefined}
    >{DROP_DOWN_SYMBOL}</span
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
