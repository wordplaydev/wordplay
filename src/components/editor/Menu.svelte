<script lang="ts">
    import Revision from '@edit/Revision';
    import RootView from '../project/RootView.svelte';
    import Block from '@nodes/Block';
    import type Menu from './util/Menu';
    import { getConceptIndex } from '../project/Contexts';
    import Speech from '../lore/Speech.svelte';
    import { locales } from '../../db/Database';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Glyphs from '../../lore/Glyphs';
    import { RevisionSet } from './util/Menu';
    import concretize from '../../locale/concretize';
    import Token from '../../nodes/Token';
    import Bind from '../../nodes/Bind';
    import Evaluate from '../../nodes/Evaluate';

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
        menu.doEdit($locales, item);
    }

    let index = getConceptIndex();

    $: selectedRevision = menu.getSelection();
    $: [newNode, newParent] =
        selectedRevision instanceof Revision
            ? selectedRevision.getEditedNode($locales)
            : [undefined, undefined];
    let evaluateBind: Bind | undefined;
    $: if (
        selectedRevision instanceof Revision &&
        newNode instanceof Bind &&
        newParent instanceof Evaluate
    ) {
        const fun = newParent.getFunction(selectedRevision.context);
        evaluateBind = fun?.inputs.find(
            (input) =>
                newNode instanceof Bind && input.hasName(newNode.getNames()[0])
        );
    }
    $: selectedConcept =
        $index && newParent && newNode
            ? $index.getRelevantConcept(evaluateBind ?? newNode)
            : undefined;
    $: selectedDocs = selectedConcept?.getDocs($locales);

    /* When the selection changes, scroll it's corresponding view and focus it. */
    let revisionViews: HTMLElement[] = [];
    $: {
        const view = revisionViews[menu.getSelectionID()];
        if (view && view !== document.activeElement) view.focus();
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
                                  node.getText().startsWith(event.key)
                          )
                    : $locales
                          .get((l) => l.term[revision.purpose])
                          .startsWith(event.key)
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
                aria-label={$locales.get((l) => l.ui.source.menu.back)}
                class:selected={menu.onBack()}
                bind:this={revisionViews[-1]}
                on:pointerdown|stopPropagation={() =>
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
                          .getEditedNode($locales)[0]
                          .getDescription(concretize, $locales, entry.context)
                          .toText()
                    : $locales.getLocale().term[entry.purpose]}
                class={`revision ${
                    itemIndex === menu.getSelectionID() ? 'selected' : ''
                } ${entry instanceof RevisionSet ? 'submenu' : ''}`}
                bind:this={revisionViews[itemIndex]}
                on:pointerdown|stopPropagation|preventDefault={() =>
                    handleItemClick(entry)}
            >
                {#if entry instanceof Revision}
                    {@const revision = entry}
                    {@const [newNode] = entry.getEditedNode($locales)}
                    {#if newNode !== undefined}
                        {#if revision.isRemoval()}
                            <strike
                                ><RootView node={newNode} localized /></strike
                            >
                        {:else}
                            <RootView node={newNode} localized />
                        {/if}
                    {:else}
                        <MarkupHTMLView
                            markup={revision.getDescription($locales)}
                        />
                    {/if}
                {:else if entry instanceof RevisionSet}
                    <MarkupHTMLView
                        markup={concretize(
                            $locales,
                            `/${$locales.get((l) =>
                                entry instanceof RevisionSet
                                    ? l.term[entry.purpose]
                                    : ''
                            )}…/`
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
                <svelte:fragment slot="content">
                    <MarkupHTMLView
                        markup={selectedRevision.getDescription($locales)}
                    />
                    {#if selectedDocs}
                        <MarkupHTMLView markup={selectedDocs} />
                    {/if}
                </svelte:fragment>
            </Speech>
        {:else if selectedRevision instanceof RevisionSet}
            {#each selectedRevision.revisions as revision}
                {@const [newNode] = revision.getEditedNode($locales)}
                {#if newNode !== undefined}
                    <div
                        class="revision"
                        on:pointerdown|stopPropagation|preventDefault={() =>
                            handleItemClick(revision)}
                    >
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

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
    }

    .menu:focus-within {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
    }

    .revisions {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        flex-grow: 1;
    }

    .revision {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
    }

    .revision:focus {
        outline: none;
    }

    .revision:focus:hover {
        outline: var(--wordplay-highlight-color) solid
            var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .revision.selected:not(:hover) {
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
    }

    .revision:hover {
        background: var(--wordplay-hover);
    }

    .revision.selected :not(.block) :global(.token-view) {
        color: var(--wordplay-background);
    }

    .details {
        margin-inline-end: auto;
        width: 15em;
        overflow-y: auto;
    }
</style>
