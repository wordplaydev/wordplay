<script lang="ts">
    import Subheader from '#components/app/Subheader.svelte';
    import setKeyboardFocus from '#components/util/setKeyboardFocus.ts';
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import Note from '#components/widgets/Note.svelte';
    import type Menu from '#edit/menu/Menu.ts';
    import { RevisionSet } from '#edit/menu/Menu.ts';
    import MenuAction from '#edit/menu/MenuAction.ts';
    import MenuActionItem from '#components/editor/menu/MenuActionItem.svelte';
    import Revision from '#edit/revision/Revision.ts';
    import Node, { isFieldPosition, ListOf } from '#nodes/Node.ts';
    import { onMount, tick } from 'svelte';
    import { locales } from '#db/Database.ts';
    import Token from '#nodes/Token.ts';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import MenuItem from '#components/editor/menu/MenuItem.svelte';
    import {
        menuMaxHeight,
        placeMenu,
        submenuFlips,
        type MenuPosition,
    } from '#components/editor/menu/menuPlacement.ts';
    import {
        hoverSelects,
        isTap,
        type PressPoint,
        pointerMoved,
        resetPointer,
    } from '#components/editor/menu/menuPointer.ts';

    interface Props {
        menu: Menu;
        /* What to run when hiding the menu */
        hide: () => void;
        /* The ideal position for the menu and the box that clips it, both in the
           containing block's coordinates; constrained below. */
        position: MenuPosition;
    }

    let { menu = $bindable(), hide, position }: Props = $props();

    // A pointer resting where the menu opens hasn't moved (see pointerMoved).
    onMount(resetPointer);

    // We pull out the organization here to avoid rerendering with the menu changes but the organization doesn't.
    // This not only helps with efficiency, but also prevent screen readers from resetting the menu item focus.
    let revisions = $derived(menu.getOrganization());

    /** See if there's a label for the field */
    let fieldLabel = $derived.by(() => {
        const anchor = menu.getAnchor();
        const root = menu.getSource().root;
        const context = menu.getProject().getContext(menu.getSource());

        let parent = undefined,
            fieldName = undefined;
        if (isFieldPosition(anchor)) {
            parent = anchor.parent;
            fieldName = anchor.field;
        } else if (anchor instanceof Node) {
            parent = menu.getSource().root.getParent(anchor);
            if (parent !== undefined)
                fieldName = parent.getFieldOfChild(anchor)?.name;
        }

        if (parent === undefined || fieldName === undefined) return;

        const field = parent.getFieldNamed(fieldName);
        if (field === undefined) return;
        const labelGenerator = field.label;
        if (labelGenerator === undefined) return;
        const index =
            field.kind instanceof ListOf && isFieldPosition(anchor)
                ? anchor.index
                : undefined;
        return labelGenerator($locales, context, index, root);
    });

    /** Constrain the menu to the box that clips it (see menuPlacement). */
    let menuWidth: number = $state(0);
    let menuHeight: number = $state(0);
    let placement = $derived(
        placeMenu(
            position,
            { width: menuWidth, height: menuHeight },
            position.container,
        ),
    );
    let menuLeft = $derived(placement.left);
    let menuTop = $derived(placement.top);

    function handleItemClick(
        item: Revision | RevisionSet | MenuAction | undefined,
    ) {
        menu.doEdit($locales, item);
    }

    /* Where the pointer went down, so a pan over the list isn't read as a choice. */
    let pressPoint: PressPoint | undefined = undefined;

    function handleItemPress(event: PointerEvent) {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        pressPoint = { x: event.clientX, y: event.clientY };
    }

    function handleItemRelease(
        event: PointerEvent,
        item: Revision | RevisionSet,
    ) {
        if (pressPoint === undefined) return;
        const tap = isTap(pressPoint, event);
        pressPoint = undefined;
        if (!tap) return;
        event.stopPropagation();
        event.preventDefault();
        handleItemClick(item);
    }

    /* When the selection changes, scroll it's corresponding view and focus it.
       A live menu is only scrolled: focus stays in the editor so typing keeps
       narrowing the list, the editor announces the selection, and the item is
       drawn selected by its class. */
    let revisionViews: HTMLElement[] = $state([]);
    $effect(() => {
        if (menu.isLive()) {
            // No focus to bring it into view, so scroll to the selection.
            if (menu.hasSelection()) {
                const selected = `menuitem-${menu.getSelectionID()}`;
                tick().then(() =>
                    document
                        .getElementById(selected)
                        ?.scrollIntoView({ block: 'nearest' }),
                );
            }
            return;
        }
        const id = `menuitem-${menu.getSelectionID()}`;
        const itemView = document.getElementById(`${id}`);
        if (itemView) {
            setKeyboardFocus(itemView, 'Focusing menu on menu change');
        } else {
            tick().then(() => {
                const id = `menuitem-${menu.getSelectionID()}`;
                const itemView = document.getElementById(`${id}`);
                if (itemView)
                    setKeyboardFocus(itemView, 'Focusing menu on menu change');
            });
        }
    });

    function handleKey(event: KeyboardEvent) {
        if (
            event.key === 'ArrowRight' &&
            menu.getSelection() instanceof RevisionSet
        ) {
            menu = menu.in();
            event.stopPropagation();
            return;
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            menu = menu.down();
            event.stopPropagation();
            return;
        } else if (event.key === 'ArrowLeft' && menu.inSubmenu()) {
            if (menu) menu = menu.out();
            event.stopPropagation();
            return;
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            if (menu) menu = menu.up();
            event.stopPropagation();
            return;
        } else if (event.key === 'Escape') {
            if (menu.inSubmenu()) menu = menu.out();
            else hide();
            event.stopPropagation();
            return;
        } else if (event.key === 'Home' || event.key === 'End') {
            menu = event.key === 'Home' ? menu.toStart() : menu.toEnd();
            event.stopPropagation();
            event.preventDefault();
            return;
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (menu.doEdit($locales, menu.getSelection())) hide();
            event.stopPropagation();
            event.preventDefault();
            return;
        } else if (event.key.length === 1) {
            // Jump to the next item, after the current one and wrapping, that
            // has a token starting with the letter, in either case: a second
            // press of the same letter reaches the second match.
            const letter = event.key.toLocaleLowerCase();
            const starts = (text: string) =>
                text.toLocaleLowerCase().startsWith(letter);
            const list = menu.getRevisionList();
            const [index, subindex] = menu.getSelectionIndex();
            const current = menu.inSubmenu() ? (subindex ?? -1) : index;
            const matches = (revision: (typeof list)[number]) =>
                revision instanceof MenuAction
                    ? starts(revision.label($locales.getLocale()))
                    : revision instanceof Revision
                      ? revision
                            .getEditedNode($locales)[0]
                            .nodes()
                            .some(
                                (node) =>
                                    node instanceof Token &&
                                    starts(node.getText()),
                            )
                      : // Through getHeader, so typing a letter finds a set named by its group
                        // (a unit category) and not only one named by its purpose.
                        starts(
                            $locales.getUnannotatedPrimaryText((l) =>
                                revision.getHeader(l),
                            ),
                        );
            let match = -1;
            for (let step = 1; step <= list.length; step++) {
                const candidate = (current + step) % list.length;
                const revision = list[candidate];
                if (revision !== undefined && matches(revision)) {
                    match = candidate;
                    break;
                }
            }
            if (match >= 0)
                menu = menu.inSubmenu()
                    ? menu.withSelection([index, match])
                    : menu.withSelection([match, undefined]);
        }
    }
</script>

<div
    class="menu"
    bind:offsetWidth={menuWidth}
    bind:offsetHeight={menuHeight}
    style:left="{menuLeft}px"
    style:top="{menuTop}px"
    style:--menu-max-height="{menuMaxHeight(position.container)}px"
>
    <!-- One focus model: an item that takes focus is read by its label. A
         live menu is the exception, and there the editor's textarea names the
         selection as its active descendant and announces it. -->
    <div
        class="revisions"
        role="menu"
        tabindex="-1"
        id={menu.getID()}
        aria-orientation="vertical"
        aria-label={$locales.getPrimaryPlainText((l) => l.ui.source.menu.label)}
        onkeydown={handleKey}
    >
        {#if fieldLabel}<div class="label"
                ><Subheader compact
                    ><LocalizedText path={fieldLabel} /></Subheader
                ></div
            >{/if}
        {#each revisions as entry, itemIndex}
            {#if entry instanceof Revision}
                <MenuItem
                    {entry}
                    bind:menu
                    {handleItemClick}
                    id="menuitem-{itemIndex}"
                />
            {:else if entry instanceof MenuAction}
                <MenuActionItem
                    {entry}
                    bind:menu
                    {handleItemClick}
                    id="menuitem-{itemIndex}"
                />
            {:else if entry.size() > 0}
                <div
                    role="menuitem"
                    tabindex="-1"
                    id="menuitem-{itemIndex}"
                    aria-expanded={menu.getSelectionIndex()[0] === itemIndex &&
                        menu.getSelectionIndex()[1] !== undefined}
                    aria-label={entry.getHeader($locales.getLocale())}
                    class={`revisionset ${
                        menu.getSelection() === entry ? 'selected' : ''
                    }`}
                    class:show={menu.getSelectionIndex()[0] === itemIndex}
                    bind:this={revisionViews[itemIndex]}
                    onpointerdown={handleItemPress}
                    onpointerup={(event) => handleItemRelease(event, entry)}
                    onpointercancel={() => (pressPoint = undefined)}
                    onpointermove={(event) => {
                        if (
                            !hoverSelects(event.pointerType) ||
                            !pointerMoved(event)
                        )
                            return;
                        // Already open: don't re-enter it on every move.
                        if (
                            menu.getSelectionIndex()[0] === itemIndex &&
                            menu.inSubmenu()
                        )
                            return;
                        event.stopPropagation();
                        event.preventDefault();
                        handleItemClick(entry);
                    }}
                    onfocusin={() => {
                        menu = menu.withSelection([itemIndex, undefined]);
                    }}
                >
                    <MarkupHTMLView markup={(l) => entry.getHeader(l)} />
                </div>
                <div
                    class="submenu"
                    class:right={submenuFlips(
                        menuLeft,
                        menuWidth,
                        position.container,
                    )}
                    role="menu"
                    tabindex="-1"
                    aria-label={entry.getHeader($locales.getLocale())}
                >
                    <!-- Only mount a submenu's items once it's the open one, so
                         closed submenus don't build their preview trees up front. -->
                    {#if menu.getSelectionIndex()[0] === itemIndex}
                        {#each entry.revisions as revision, subitemIndex}
                            <MenuItem
                                entry={revision}
                                bind:menu
                                {handleItemClick}
                                id={`menuitem-${itemIndex}-${subitemIndex}`}
                            />
                        {/each}
                    {/if}
                </div>
            {/if}
        {:else}
            <!-- Feedback if there are no items.-->
            <div class="empty"
                ><Note
                    ><LocalizedText
                        path={(l) => l.ui.source.menu.empty}
                    /></Note
                ></div
            >
        {/each}
    </div>
</div>

<style>
    .menu,
    .submenu {
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius)
            var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);
        border-spacing: 0;

        /* Submenus should be absolute relative to this */
        position: relative;
    }

    .label,
    .empty {
        padding: var(--wordplay-spacing);
    }

    .menu {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);

        /* Position the menu as floating, but bounded to the viewport */
        position: absolute;

        width: auto;
        height: auto;

        /* Max size. The height is capped by the box that clips the menu (see
           menuPlacement), so a tall menu can't be placed where it's unreachable. */
        max-width: 100%;
        max-height: min(30vh, var(--menu-max-height, 30vh));

        /* Position above tiles (z-index 1) and the sidebar resize knob
           (ResizeKnob, z-index 3), which shares this stacking context and
           would otherwise cover the autocomplete menu at the editor edge. */
        z-index: 4;
    }

    .revisions {
        width: fit-content;
        height: auto;
        overflow-y: auto;
        /* `pan-y`, not `none`: the list must be finger-scrollable. (The menu is not
           a drag surface — editor node drag lives in .editor, which suppresses
           touch-action only once a drag actually starts.) */
        touch-action: pan-y;
        overscroll-behavior: contain;
    }

    .submenu {
        position: absolute;
        background: var(--wordplay-background);
        inset-inline-start: 100%;
        top: 0;
        display: none;
        flex-direction: column;
        width: max-content;
        max-height: 20em;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
        touch-action: pan-y;
        overscroll-behavior: contain;
    }

    .submenu.right {
        inset-inline-start: auto;
        inset-inline-end: 100%;
    }

    .show + .submenu {
        display: flex;
    }

    .revisions {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .revisionset {
        padding: var(--wordplay-spacing);
        cursor: pointer;
        border-top: dashed var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .revisionset:nth-last-child(2) {
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    .revisionset:focus,
    .revisionset.selected {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .show {
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
