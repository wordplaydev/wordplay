<script lang="ts">
    import { blocks, locales } from '@db/Database';
    import Menu from './util/Menu';
    import Revision from '@edit/Revision';
    import { RevisionSet } from './util/Menu';
    import RootView from '@components/project/RootView.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    // import Speech from '@components/lore/Speech.svelte';
    // import { getConceptIndex } from '@components/project/Contexts';
    // import Bind from '../../nodes/Bind';
    // import Evaluate from '../../nodes/Evaluate';
    // import Input from '@nodes/Input';

    interface Props {
        // import Glyphs from '../../lore/Glyphs';
        entry: Revision;
        menu: Menu;
        id: string;
        handleItemClick: (item: Revision | RevisionSet | undefined) => void;
    }

    let { entry, menu = $bindable(), id, handleItemClick }: Props = $props();

    // let index = getConceptIndex();

    let [newNode] = $derived(entry.getEditedNode($locales));

    // function getEvaluateBind(selectedRevision: Revision) {
    //     let evaluateBind: Bind | undefined;
    //     if (
    //         selectedRevision instanceof Revision &&
    //         newNode instanceof Input &&
    //         newParent instanceof Evaluate
    //     ) {
    //         const fun = newParent.getFunction(selectedRevision.context);
    //         evaluateBind = fun?.inputs.find(
    //             (input) =>
    //                 newNode instanceof Input &&
    //                 input.hasName(newNode.getName()),
    //         );
    //     }
    //     return evaluateBind;
    // }
</script>

<div
    role="menuitem"
    tabindex="-1"
    {id}
    aria-label={entry
        .getEditedNode($locales)[0]
        .getDescription($locales, entry.context)
        .toText()}
    onpointerdown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleItemClick(entry);
    }}
    class={`revision ${menu.getSelection() === entry ? 'selected' : ''}`}
    onfocusin={() => {
        const index = menu.getSelectionFor(entry);
        if (index) menu = menu.withSelection(index);
    }}
>
    {#if newNode !== undefined}
        {#if entry.isRemoval()}
            <strike
                ><RootView
                    node={newNode}
                    localized="symbolic"
                    blocks={$blocks}
                    inline={true}
                /></strike
            >
        {:else}
            <RootView
                node={newNode}
                localized="symbolic"
                blocks={$blocks}
                inline={true}
            />
        {/if}
    {:else}
        <MarkupHTMLView markup={entry.getDescription($locales)} />
    {/if}

    <!-- {#if menu.getSelection() === entry}
        {@const evaluateBind = getEvaluateBind(entry)}
        {@const selectedConcept =
            $index && newParent && newNode
                ? $index.getRelevantConcept(evaluateBind ?? newNode)
                : undefined}
        {@const selectedDocs = selectedConcept?.getDocs($locales)}

        <div class="details">
            <Speech glyph={selectedConcept ?? Glyphs.Program} below>
                <svelte:fragment slot="content">
                    <MarkupHTMLView markup={entry.getDescription($locales)} />
                    {#if selectedDocs}
                        <MarkupHTMLView markup={selectedDocs} />
                    {/if}
                </svelte:fragment>
            </Speech>
        </div>
    {/if} -->
</div>

<style>
    .revision {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        cursor: pointer;
    }

    .revision:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
    }

    .revision.selected :not(:global(.block)) :global(.token-view) {
        color: var(--wordplay-background);
    }

    .revision:hover {
        background: var(--wordplay-hover);
    }

    .details {
        display: none;
        position: absolute;
        top: 0;
        left: 100%;
        margin-inline-end: auto;
        width: 15em;
        overflow-y: auto;
    }
</style>
