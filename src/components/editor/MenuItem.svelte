<script lang="ts">
    import { blocks, locales } from '@db/Database';
    import Menu from './util/Menu';
    import Revision from '@edit/Revision';
    import { RevisionSet } from './util/Menu';
    import RootView from '@components/project/RootView.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';

    interface Props {
        entry: Revision;
        menu: Menu;
        id: string;
        handleItemClick: (item: Revision | RevisionSet | undefined) => void;
    }

    let { entry, menu = $bindable(), id, handleItemClick }: Props = $props();

    let [newNode] = $derived(entry.getEditedNode($locales));
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
