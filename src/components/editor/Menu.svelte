<script lang="ts">
    import Revision from '@edit/Revision';
    import type Menu from './util/Menu';
    import { locales } from '../../db/Database';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import { RevisionSet } from './util/Menu';
    import Token from '../../nodes/Token';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import MenuItem from './MenuItem.svelte';
    import { tick } from 'svelte';

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
                          .get((l) => l.term[revision.purpose])
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
        {#each revisions as entry, itemIndex}
            {#if entry instanceof Revision}
                <MenuItem
                    {entry}
                    bind:menu
                    {handleItemClick}
                    id="menuitem-{itemIndex}"
                />
            {:else}
                <div
                    role="menuitem"
                    tabindex="-1"
                    id="menuitem-{itemIndex}"
                    aria-expanded={menu.getSelectionIndex()[0] === itemIndex &&
                        menu.getSelectionIndex()[1] !== undefined}
                    aria-label={$locales.getLocale().term[entry.purpose]}
                    class={`revisionset ${
                        menu.getSelection() === entry ? 'selected' : ''
                    }`}
                    class:show={menu.getSelectionIndex()[0] === itemIndex}
                    bind:this={revisionViews[itemIndex]}
                    onpointerdown={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        handleItemClick(entry);
                    }}
                    onfocusin={() => {
                        const selection = menu.getSelectionIndex();
                        menu = menu.withSelection(
                            entry instanceof RevisionSet ||
                                selection === undefined
                                ? [itemIndex, undefined]
                                : [selection[0], itemIndex],
                        );
                    }}
                >
                    <MarkupHTMLView
                        markup={$locales.concretize(
                            `/${$locales.get((l) => l.term[entry.purpose])}…/`,
                        )}
                    />
                </div>
                <div
                    class="submenu"
                    role="menu"
                    tabindex="-1"
                    aria-label={$locales.getLocale().term[entry.purpose]}
                >
                    {#each entry.revisions as revision, subitemIndex}
                        <MenuItem
                            entry={revision}
                            bind:menu
                            {handleItemClick}
                            id={`menuitem-${itemIndex}-${subitemIndex}`}
                        />
                    {:else}
                        <!-- Feedback if there are no items.-->
                        &mdash;
                    {/each}
                </div>
            {/if}
        {:else}
            <!-- Feedback if there are no items.-->
            &mdash;
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
        /* Default size */
        min-width: 15em;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;

        /* Submenus should be absolute relative to this */
        position: relative;
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
    }

    .revisions {
        width: fit-content;
        height: auto;
        overflow-y: auto;
        padding: var(--wordplay-spacing);
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
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
    }

    .revisionset:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .revisionset:hover {
        background: var(--wordplay-hover);
    }
</style>
