<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import type Menu from '@edit/menu/Menu';
    import { RevisionSet } from '@edit/menu/Menu';
    import Revision from '@edit/revision/Revision';
    import Node, { isFieldPosition, ListOf } from '@nodes/Node';
    import { tick } from 'svelte';
    import { locales } from '../../../db/Database';
    import Token from '../../../nodes/Token';
    import MarkupHTMLView from '../../concepts/MarkupHTMLView.svelte';
    import MenuItem from '../menu/MenuItem.svelte';

    interface Props {
        menu: Menu;
        /* What to run when hiding the menu */
        hide: () => void;
        /* The ideal position for the menu, adjusted based on viewport below. */
        position: { left: number; top: number };
    }

    let { menu = $bindable(), hide, position }: Props = $props();

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

    /**
     * Constrain the menu position to the viewport.
     * left + width < window.innerWidth
     * top + height < window.innerHeight
     */
    let menuWidth: number = $state(0);
    let menuHeight: number = $state(0);
    let menuLeft = $derived(
        Math.min(position.left, window.innerWidth - menuWidth),
    );
    let menuTop = $derived(
        Math.min(position.top, window.innerHeight - menuHeight),
    );

    function handleItemClick(item: Revision | RevisionSet | undefined) {
        menu.doEdit($locales, item);
    }

    /* When the selection changes, scroll it's corresponding view and focus it. */
    let revisionViews: HTMLElement[] = $state([]);
    $effect(() => {
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
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (menu.doEdit($locales, menu.getSelection())) hide();
            event.stopPropagation();
            event.preventDefault();
            return;
        } else if (event.key.length === 1) {
            // Find the first visible revision that has a token that starts with the letter.
            const match = menu.getRevisionList().findIndex((revision) =>
                revision instanceof Revision
                    ? revision
                          .getEditedNode($locales)[0]
                          .nodes()
                          .some(
                              (node) =>
                                  node instanceof Token &&
                                  node.getText().startsWith(event.key),
                          )
                    : $locales
                          .get(
                              (l) =>
                                  l.ui.docs.purposes[revision.purpose].header,
                          )
                          .startsWith(event.key),
            );
            if (match)
                menu = menu.inSubmenu()
                    ? menu.withSelection([menu.getSelectionIndex()[0], match])
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
>
    <div
        class="revisions"
        role="menu"
        tabindex="-1"
        aria-orientation="vertical"
        aria-label={$locales.get((l) => l.ui.source.menu.label)}
        aria-activedescendant="menuitem-{menu.inSubmenu()
            ? `${menu.getSelectionIndex()[0]}-${menu.getSelectionIndex()[1]}`
            : menu.getSelectionIndex()[0]}"
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
            {:else if entry.size() > 0}
                <div
                    role="menuitem"
                    tabindex="-1"
                    id="menuitem-{itemIndex}"
                    aria-expanded={menu.getSelectionIndex()[0] === itemIndex &&
                        menu.getSelectionIndex()[1] !== undefined}
                    aria-label={$locales.getLocale().ui.docs.purposes[
                        entry.purpose
                    ].header}
                    class={`revisionset ${
                        menu.getSelection() === entry ? 'selected' : ''
                    }`}
                    class:show={menu.getSelectionIndex()[0] === itemIndex}
                    bind:this={revisionViews[itemIndex]}
                    onpointerdown={(event) => {
                        if (event.button !== 0) return;
                        event.stopPropagation();
                        event.preventDefault();
                        handleItemClick(entry);
                    }}
                    onpointerenter={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        handleItemClick(entry);
                    }}
                    onfocusin={() => {
                        menu = menu.withSelection([itemIndex, undefined]);
                    }}
                >
                    <MarkupHTMLView
                        markup={$locales.concretize(
                            `/${$locales.get((l) => l.ui.docs.purposes[entry.purpose]?.header)}…/`,
                        )}
                    />
                </div>
                <div
                    class="submenu"
                    class:right={menuLeft + menuWidth * 2 > window.innerWidth}
                    role="menu"
                    tabindex="-1"
                    aria-label={$locales.getLocale().ui.docs.purposes[
                        entry.purpose
                    ].header}
                >
                    {#each entry.revisions as revision, subitemIndex}
                        <MenuItem
                            entry={revision}
                            bind:menu
                            {handleItemClick}
                            id={`menuitem-${itemIndex}-${subitemIndex}`}
                        />
                    {/each}
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

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;

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

        /* Max size */
        max-width: 100vw;
        max-height: 30vh;

        /** Position above tiles */
        z-index: 2;
    }

    .revisions {
        width: fit-content;
        height: auto;
        overflow-y: auto;
    }

    .submenu {
        position: absolute;
        background: var(--wordplay-background);
        left: 100%;
        top: 0;
        display: none;
        max-height: 20em;
        padding: var(--wordplay-spacing);
        overflow-y: auto;
    }

    .submenu.right {
        left: auto;
        right: 100%;
    }

    .show + .submenu {
        display: block;
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

    .revisionset:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .show {
        background: var(--wordplay-hover);
    }
</style>
