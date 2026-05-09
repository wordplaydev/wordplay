<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { blocks, locales } from '@db/Database';
    import Menu, { RevisionSet } from '@edit/menu/Menu';
    import Replace from '@edit/revision/Replace';
    import Revision from '@edit/revision/Revision';
    import type Node from '@nodes/Node';
    import getPreferredSpaces from '@parser/getPreferredSpaces';

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
    let [parent, removed] = $derived(entry.getRemovalContext());

    /** For a Replace, find descendants of the rendered node that are reused
     *  (reference-equal) from the original being replaced and whose serialized
     *  form spans more than 3 lines. Those are elided to "…" so the menu item
     *  doesn't get dominated by unchanged code. Top-down walk: once a subtree
     *  is elided, we don't descend into it (no double-eliding). */
    let elided = $derived.by<Node[]>(() => {
        if (isRemoval || !(entry instanceof Replace) || newNode === undefined)
            return [];
        const originalNodes = new Set<Node>(entry.node.nodes());
        // Use preferred spaces so multi-line constructs report real line counts.
        // toWordplay() with no spaces collapses everything onto one line.
        const spaces = getPreferredSpaces(newNode);
        const result: Node[] = [];
        function walk(n: Node) {
            if (
                n !== newNode &&
                originalNodes.has(n) &&
                n.toWordplay(spaces).split('\n').length > 3
            ) {
                result.push(n);
                return;
            }
            for (const child of n.getChildren()) walk(child);
        }
        walk(newNode);
        return result;
    });
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
        if (view && menu.getOrganization().includes(entry))
            setKeyboardFocus(view, 'Focusing menu item on pointer enter');
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
            {elided}
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
