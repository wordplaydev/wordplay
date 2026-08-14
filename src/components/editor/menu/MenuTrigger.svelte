<script lang="ts">
    import type { CaretPosition } from '@edit/caret/Caret';
    import { isFieldPosition, type FieldPosition } from '@nodes/Node';
    import {
        DOCS_SYMBOL,
        DROP_DOWN_SYMBOL,
        LOCALE_SYMBOL,
    } from '@parser/Symbols';
    import { getSetMenuAnchor } from '@components/project/Contexts';
    import {
        isTap,
        type PressPoint,
    } from '@components/editor/menu/menuPointer';

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
            event.preventDefault();
            $menuNode(anchor);
        }
    }

    /** Where the pointer went down. The menu opens on release, not press, so a
     *  scroll that happens to start on this 24×24 target scrolls instead of
     *  opening a menu the creator then has to dismiss. */
    let pressPoint: PressPoint | undefined = undefined;
</script>

<span
    class="trigger"
    data-field={field}
    role="button"
    tabindex="0"
    onpointerdown={(event) => {
        if (event.button !== 0) return;
        // Claim the gesture so the editor beneath doesn't move the caret, which
        // would hide the menu we're about to open.
        event.stopPropagation();
        pressPoint = { x: event.clientX, y: event.clientY };
    }}
    onpointerup={(event) => {
        if (pressPoint === undefined) return;
        const tap = isTap(pressPoint, event);
        pressPoint = undefined;
        if (tap) show(event);
    }}
    onpointercancel={() => (pressPoint = undefined)}
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
        /* Drop the double-tap-zoom delay on this target without disabling panning. */
        touch-action: manipulation;
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
