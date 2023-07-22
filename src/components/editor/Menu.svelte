<script lang="ts">
    import type Revision from '@edit/Revision';
    import RootView from '../project/RootView.svelte';
    import Block from '@nodes/Block';
    import type Menu from './util/Menu';
    import { getConceptIndex } from '../project/Contexts';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Reference from '../../nodes/Reference';
    import Evaluate from '../../nodes/Evaluate';
    import BinaryEvaluate from '../../nodes/BinaryEvaluate';
    import UnaryEvaluate from '../../nodes/UnaryEvaluate';

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

    function handleItemClick(item: Revision) {
        menu.doEdit($creator.getLanguages(), item);
    }

    let index = getConceptIndex();

    $: selectedRevision = menu.getSelection();
    $: selectedNewNode = selectedRevision?.getNewNode($creator.getLanguages());
    $: selectedDefinition = selectedRevision
        ? selectedNewNode instanceof Reference
            ? selectedNewNode.resolve(selectedRevision.context)
            : selectedNewNode instanceof Evaluate ||
              selectedNewNode instanceof BinaryEvaluate ||
              selectedNewNode instanceof UnaryEvaluate
            ? selectedNewNode.getFunction(selectedRevision.context)
            : undefined
        : undefined;
    $: selectedDocs = selectedConcept?.getDocs($creator.getLocale());
    $: selectedConcept = $index
        ? selectedDefinition
            ? $index.getStructureConcept(selectedDefinition)
            : selectedNewNode
            ? $index.getNodeConcept(selectedNewNode)
            : undefined
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
        {#each menu.getRevisions() as revision, itemIndex}
            {@const [newNode] = revision.getEditedNode($creator.getLanguages())}
            <!-- Prevent default is to ensure focus isn't lost on editor -->
            <div
                class={`revision ${
                    itemIndex === menu.getSelectionID() ? 'selected' : ''
                }`}
                bind:this={revisionViews[itemIndex]}
                on:pointerdown|preventDefault|stopPropagation={() =>
                    handleItemClick(revision)}
            >
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
                    <em>Remove</em>
                {/if}
            </div>
        {:else}
            <!-- Feedback if there are no items.-->
            &mdash;
        {/each}
    </div>
    {#if selectedRevision}
        <div class="details">
            <Speech glyph={selectedConcept ?? Glyphs.Program} below>
                <MarkupHTMLView
                    markup={selectedRevision.getDescription(
                        $creator.getLocale()
                    )}
                />
                {#if selectedDocs}
                    <MarkupHTMLView markup={selectedDocs.asFirstParagraph()} />
                {/if}
            </Speech>
        </div>
    {/if}
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
