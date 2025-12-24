<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import RootView from '@components/project/RootView.svelte';
    import { blocks, locales } from '@db/Database';
    import Revision from '@edit/Revision';
    import Menu, { RevisionSet } from './Menu';

    interface Props {
        entry: Revision;
        menu: Menu;
        id: string;
        handleItemClick: (item: Revision | RevisionSet | undefined) => void;
    }

    let { entry, menu = $bindable(), id, handleItemClick }: Props = $props();

    /** Is removal */
    let isRemoval = $derived(entry.isRemoval());

    /** Get the node created after the revision, for possible rendering */
    let [newNode] = $derived(entry.getEditedNode($locales));

    /** If a removal, get a duplicated parent node, and list of nodes to be removed */
    let [parent, removed] = $derived(entry.getParentAndRemoved());
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
        if (event.button !== 0) return;
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
        <RootView
            node={isRemoval ? parent : newNode}
            locale="symbolic"
            blocks={$blocks}
            inline={true}
            removed={isRemoval ? removed : []}
        />
    {:else}
        <MarkupHTMLView markup={entry.getDescription($locales)} />
    {/if}
</div>

<style>
    .revision {
        padding: var(--wordplay-spacing);
        cursor: pointer;
        border-top: dashed var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .revision:first-child {
        border-top: none;
    }

    .revision:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
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
