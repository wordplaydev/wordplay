<script lang="ts">
    /**
     * A menu row that does something to the selected node rather than changing
     * it into something else.
     *
     * A sibling of `MenuItem` rather than a branch inside it: every line of that
     * component is about previewing the code a revision would produce — the
     * elision of reused subtrees, the doc-derived note, the removal's parent —
     * and an action has no code to show. Its words are the whole row.
     */
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        hoverSelects,
        isTap,
        type PressPoint,
    } from '@components/editor/menu/menuPointer';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type Menu from '@edit/menu/Menu';
    import type { RevisionSet } from '@edit/menu/Menu';
    import type MenuAction from '@edit/menu/MenuAction';
    import type Revision from '@edit/revision/Revision';

    interface Props {
        entry: MenuAction;
        menu: Menu;
        id: string;
        handleItemClick: (
            item: Revision | RevisionSet | MenuAction | undefined,
        ) => void;
    }

    let { entry, menu = $bindable(), id, handleItemClick }: Props = $props();

    let view: HTMLDivElement | undefined = $state(undefined);

    /** Where the pointer went down, so a pan over the list isn't read as a choice. */
    let pressPoint: PressPoint | undefined = undefined;

    let isSelected = $derived(menu.getSelection() === entry);

    $effect(() => {
        if (isSelected && view) setKeyboardFocus(view, 'Focusing menu action');
    });
</script>

<div
    role="menuitem"
    tabindex="-1"
    {id}
    class="action"
    class:selected={isSelected}
    aria-label={entry.label($locales.getLocale())}
    bind:this={view}
    onpointerdown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        pressPoint = { x: event.clientX, y: event.clientY };
    }}
    onpointerup={(event) => {
        if (pressPoint === undefined) return;
        const tap = isTap(pressPoint, event);
        pressPoint = undefined;
        if (!tap) return;
        event.preventDefault();
        event.stopPropagation();
        handleItemClick(entry);
    }}
    onpointercancel={() => (pressPoint = undefined)}
    onpointerenter={(event) => {
        if (!hoverSelects(event.pointerType)) return;
        event.stopPropagation();
        event.preventDefault();
        const selection = menu.getSelectionFor(entry);
        if (selection) menu = menu.withSelection(selection);
    }}
    onfocusin={() => {
        const selection = menu.getSelectionFor(entry);
        if (selection) menu = menu.withSelection(selection);
    }}
>
    <MarkupHTMLView markup={(l) => entry.label(l)} />
</div>

<style>
    .action {
        padding: var(--wordplay-spacing);
        cursor: pointer;
        border-top: dashed var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .action.selected,
    .action:hover {
        background: var(--wordplay-hover);
        /* Text and links on the gold, per --wordplay-hover-text in app.html:
           --wordplay-foreground is white in dark mode and measures 3.58:1 here,
           and the old --color-white link override measured 3.01:1 in light
           (#1216). The orange underline is what still marks a link. */
        color: var(--wordplay-hover-text);
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: var(--color-orange);
    }
</style>
