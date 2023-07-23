<script lang="ts">
    import Revision from '@edit/Revision';
    import RootView from '../project/RootView.svelte';
    import Block from '@nodes/Block';
    import type Menu from './util/Menu';
    import { getConceptIndex } from '../project/Contexts';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Glyphs from '../../lore/Glyphs';
    import { RevisionSet } from './util/Menu';
    import concretize from '../../locale/concretize';
    import Token from '../../nodes/Token';

    export let menu: Menu;
    /* What to run when hiding the menu */
    export let hide: () => void;
    /* The ideal position for the menu, adjusted based on viewport below. */
    export let position: { left: number; top: number };

    // We pull out the organization here to avoid rerendering with the menu changes but the organization doesn't.
    // This not only helps with efficiency, but also prevent screen readers from resetting the menu item focus.
    $: revisions = menu.getRevisionList();

    /**
     * Constrain the menu position to the viewport.
     * left + width < window.innerWidth
     * top + height < window.innerHeight
     */
    let menuWidth: number;
    let menuHeight: number;
    $: menuLeft = Math.min(position.left, window.innerWidth - menuWidth);
    $: menuTop = Math.min(position.top, window.innerHeight - menuHeight);

    function handleItemClick(item: Revision | RevisionSet | undefined) {
        menu.doEdit($creator.getLanguages(), item);
    }

    let index = getConceptIndex();

    $: selectedRevision = menu.getSelection();
    $: selectedNewNode =
        selectedRevision instanceof Revision
            ? selectedRevision.getNewNode($creator.getLanguages())
            : undefined;
    $: selectedDocs = selectedConcept?.getDocs($creator.getLocale());
    $: selectedConcept =
        $index && selectedNewNode
            ? $index.getRelevantConcept(selectedNewNode)
            : undefined;

    /* When the selection changes, scroll it's corresponding view and focus it. */
    let revisionViews: HTMLElement[] = [];
    $: {
        const view = revisionViews[menu.getSelectionID()];
        if (view) {
            // view.scrollIntoView({ block: 'center' });
            if (view !== document.activeElement) view.focus();
        }
    }

    function handleKey(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            menu = menu.down();
            event.stopPropagation();
            return;
        } else if (event.key === 'ArrowUp') {
            menu = menu.up();
            event.stopPropagation();
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
            menu = menu.out();
            event.stopPropagation();
            return;
        } else if (event.key === 'ArrowRight') {
            menu = menu.in();
            event.stopPropagation();
            return;
        } else if (event.key === 'Escape') {
            if (menu.inSubmenu()) menu = menu.out();
            else hide();
            event.stopPropagation();
            return;
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (menu.doEdit($creator.getLanguages(), menu.getSelection()))
                hide();
            event.stopPropagation();
            event.preventDefault();
            return;
        } else if (event.key.length === 1) {
            // Find the first visible revision that has a token that starts with the letter.
            const match = menu.getRevisionList().findIndex((revision) =>
                revision instanceof Revision
                    ? revision
                          .getEditedNode($creator.getLanguages())[0]
                          .nodes()
                          .some(
                              (node) =>
                                  node instanceof Token &&
                                  node.getText().startsWith(event.key)
                          )
                    : $creator
                          .getLocale()
                          .term[revision.purpose].startsWith(event.key)
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
        aria-label={$creator.getLocale().ui.tooltip.menu}
        aria-activedescendant="menuitem-{menu.inSubmenu()
            ? menu.getSelectionIndex()[1]
            : menu.getSelectionIndex()[0]}"
        on:keydown={handleKey}
    >
        {#if menu.inSubmenu()}
            <div
                role="menuitem"
                class="revision"
                tabindex="-1"
                id="menuitem--1"
                aria-label={$creator.getLocale().ui.tooltip.menuBack}
                class:selected={menu.onBack()}
                bind:this={revisionViews[-1]}
                on:pointerdown|preventDefault|stopPropagation={() =>
                    handleItemClick(undefined)}>←</div
            >
        {/if}
        {#each revisions as entry, itemIndex}
            <div
                role="menuitem"
                tabindex="-1"
                id="menuitem-{itemIndex}"
                aria-label={entry instanceof Revision
                    ? entry
                          .getEditedNode($creator.getLanguages())[0]
                          .getDescription(
                              concretize,
                              $creator.getLocale(),
                              entry.context
                          )
                          .toText()
                    : $creator.getLocale().term[entry.purpose]}
                class={`revision ${
                    itemIndex === menu.getSelectionID() ? 'selected' : ''
                } ${entry instanceof RevisionSet ? 'submenu' : ''}`}
                bind:this={revisionViews[itemIndex]}
                on:pointerdown|preventDefault|stopPropagation={() =>
                    handleItemClick(entry)}
            >
                {#if entry instanceof Revision}
                    {@const revision = entry}
                    {@const [newNode] = entry.getEditedNode(
                        $creator.getLanguages()
                    )}
                    {#if newNode !== undefined}
                        <RootView
                            node={newNode instanceof Block &&
                            newNode.statements.length > 1
                                ? newNode
                                : newNode}
                            localized
                        />
                        <!-- If the new parent is a block with more than one statement, show the new node only instead -->
                    {:else}
                        <MarkupHTMLView
                            markup={revision.getDescription(
                                $creator.getLocale()
                            )}
                        />
                    {/if}
                {:else if entry instanceof RevisionSet}
                    <MarkupHTMLView
                        markup={concretize(
                            $creator.getLocale(),
                            `/${$creator.getLocale().term[entry.purpose]}…/`
                        )}
                    />
                {/if}
            </div>
        {:else}
            <!-- Feedback if there are no items.-->
            &mdash;
        {/each}
    </div>
    <div class="details">
        {#if selectedRevision instanceof Revision}
            <Speech glyph={selectedConcept ?? Glyphs.Program} below>
                <MarkupHTMLView
                    markup={selectedRevision.getDescription(
                        $creator.getLocale()
                    )}
                />
                {#if selectedDocs}
                    <MarkupHTMLView markup={selectedDocs} />
                {/if}
            </Speech>
        {:else if selectedRevision instanceof RevisionSet}
            {#each selectedRevision.revisions as revision}
                {@const [newNode] = revision.getEditedNode(
                    $creator.getLanguages()
                )}
                {#if newNode !== undefined}
                    <div class="revision">
                        <RootView
                            node={newNode instanceof Block &&
                            newNode.statements.length > 1
                                ? newNode
                                : newNode}
                            localized
                        />
                    </div>
                {/if}
            {/each}
        {/if}
    </div>
</div>

<style>
    .menu {
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius)
            var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);

        /* Position the menu as floating, but bounded to the viewport */
        position: absolute;

        /* Default size */
        width: 30em;
        height: auto;

        /* Max size */
        max-width: 100vw;
        max-height: 30vh;

        border-spacing: 0;

        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    .menu:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }

    .revisions {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        overflow-y: scroll;
        overflow-x: hidden;
        flex-grow: 1;
    }

    .revision {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
    }

    .revision.selected {
        background: var(--wordplay-highlight);
        color: var(--wordplay-background);
    }

    .revision.selected :global(.token-view) {
        color: var(--wordplay-background);
    }

    .details {
        margin-inline-end: auto;
        width: 15em;
        overflow-y: scroll;
    }
</style>
