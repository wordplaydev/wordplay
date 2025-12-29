<script lang="ts">
    import type { CaretPosition } from '@edit/caret/Caret';
    import { isFieldPosition, type FieldPosition } from '@nodes/Node';
    import {
        DOCS_SYMBOL,
        DROP_DOWN_SYMBOL,
        LOCALE_SYMBOL,
    } from '@parser/Symbols';
    import { getSetMenuAnchor } from '../../project/Contexts';

    interface Props {
        anchor: CaretPosition | FieldPosition;
        insert?: boolean;
    }

    let { anchor, insert = false }: Props = $props();

    const menuNode = getSetMenuAnchor();
    const field = $derived(isFieldPosition(anchor) ? anchor.field : undefined);

    function show(event: PointerEvent | KeyboardEvent) {
        if (event instanceof PointerEvent && event.button !== 0) return;

        if (menuNode) {
            event.stopPropagation();
            $menuNode(anchor);
        }
    }
</script>

<span
    class="trigger"
    data-field={field}
    role="button"
    tabindex="0"
    onpointerdown={show}
    onkeydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? show(event) : undefined}
    >{insert
        ? '+'
        : field === 'docs'
          ? DOCS_SYMBOL
          : field === 'language'
            ? LOCALE_SYMBOL
            : DROP_DOWN_SYMBOL}</span
>

<style>
    .trigger {
        color: var(--wordplay-chrome);
        font-size: var(--wordplay-font-size);
        font-style: normal;
        transition: transform calc(var(--animation-factor) * 0.1s);
    }

    .trigger:hover,
    .trigger:focus {
        color: var(--wordplay-foreground);
        cursor: pointer;
    }

    .trigger:focus {
        outline: none;
        color: var(--wordplay-focus-color);
        transform: scale(2);
    }
</style>
