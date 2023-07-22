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

    export let menu: Menu;
    /* The ideal position for the menu, adjusted based on viewport below. */
    export let position: { left: number; top: number };

    /**
     * Constrain the menu position to the viewport.
     * left + width < window.innerWidth
     * top + height < window.innerHeight
     */
    let menuWidth: number;
    let menuHeight: number;
    $: menuLeft = Math.min(position.left, window.innerWidth - menuWidth);
    $: menuTop = Math.min(position.top, window.innerHeight - menuHeight);

    function handleItemClick(item: Revision | RevisionSet) {
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

    let revisionViews: HTMLElement[] = [];
    $: {
        const view = revisionViews[menu.getSelectionID()];
        if (view) view.scrollIntoView();
    }
</script>

<div
    class="menu"
    bind:offsetWidth={menuWidth}
    bind:offsetHeight={menuHeight}
    style:left="{menuLeft}px"
    style:top="{menuTop}px"
>
    <div class="revisions">
        {#each menu.getRevisionList() as entry, itemIndex}
            <!-- Prevent default is to ensure focus isn't lost on editor -->
            <div
                class={`revision ${
                    itemIndex === menu.getSelectionID() ? 'selected' : ''
                }`}
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
