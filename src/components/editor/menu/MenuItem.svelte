<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
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

    let view: HTMLDivElement | undefined = $state(undefined);

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
    bind:this={view}
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
    onpointerenter={() => {
        if (view) setKeyboardFocus(view, 'Focusing menu item on pointer enter');
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

    .revision:last-child {
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    .revision:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
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
