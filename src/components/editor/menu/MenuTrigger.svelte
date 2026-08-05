<script lang="ts">
    import type { CaretPosition } from '@edit/caret/Caret';
    import { isFieldPosition, type FieldPosition } from '@nodes/Node';
    import {
        DOCS_SYMBOL,
        DROP_DOWN_SYMBOL,
        LOCALE_SYMBOL,
    } from '@parser/Symbols';
    import { getSetMenuAnchor } from '@components/project/Contexts';

    interface Props {
        anchor: CaretPosition | FieldPosition;
        insert?: boolean;
    }

    let { anchor, insert = false }: Props = $props();

    const menuNode = getSetMenuAnchor();
    const field = $derived(isFieldPosition(anchor) ? anchor.field : undefined);

    function show(event: PointerEvent | KeyboardEvent) {
        if (event instanceof PointerEvent && event.button !== 0) return;
        if (menuNode === undefined) return;

        if ($menuNode) {
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
        /* WCAG 2.5.8 requires pointer targets of at least 24×24px; the bare
           glyph is only ~7px wide. Centering it in a minimum box keeps the
           glyph size unchanged. */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        min-height: 24px;
    }

    .trigger {
        margin-inline-end: var(--wordplay-spacing-half);
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
