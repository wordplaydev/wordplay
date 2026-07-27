<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import RootView from '@components/project/RootView.svelte';
    import Note from '@components/widgets/Note.svelte';
    import getMenuNoteMarkup from './menuNote';
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

    /** The selected item is always rendered/labeled (see `visible` below) so a
     *  screen reader reading the menu's active descendant never races the
     *  intersection observer. */
    let isSelected = $derived(menu.getSelection() === entry);

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

    /** Lazily mount the (expensive) RootView preview only once this item scrolls
     *  into the menu's scroll container. A long candidate list (e.g. a Language
     *  node's ~50 locale options) would otherwise mount dozens of node-view
     *  trees up front — slow to show, and slow to tear down on dismiss. Both
     *  the `.revisions` list and a `.submenu` carry role="menu", so that's the
     *  right intersection root for top-level and submenu items alike. Latch
     *  visible so scrolling back and forth doesn't thrash mount/unmount. */
    let visible = $state(false);
    $effect(() => {
        const el = view;
        if (!(el instanceof HTMLElement) || visible) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    visible = true;
                    observer.disconnect();
                }
            },
            { root: el.closest('[role="menu"]'), rootMargin: '100px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    });
</script>

<div
    role="menuitem"
    tabindex="-1"
    bind:this={view}
    {id}
    aria-label={visible || isSelected
        ? entry
              .getEditedNode($locales)[0]
              .getDescription($locales, entry.context)
              .toText()
        : undefined}
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
    {#if visible || isSelected}
        {#if newNode !== undefined}
            <RootView
                node={isRemoval ? parent : newNode}
                locale="symbolic"
                blocks={$blocks}
                inline={true}
                removed={isRemoval ? removed : []}
                {elided}
            />
            {#if !isRemoval}
                <!-- A doc-derived preview of what this node does. The row's aria-label
                     already speaks the node's (concise) description, so this visible hint
                     is aria-hidden to avoid a screen reader reading two summaries. -->
                <span class="note-wrap" aria-hidden="true">
                    <Note inline
                        ><MarkupHTMLView
                            markup={getMenuNoteMarkup(
                                newNode,
                                entry.context,
                                $locales,
                            )}
                            inline
                    /></Note>
                </span>
            {/if}
        {:else}
            <MarkupHTMLView markup={entry.getDescription($locales)} />
        {/if}
    {:else}
        <!-- Reserve a line of height until the preview mounts, so the scrollbar
             and intersection bounds stay stable. -->
        <span class="placeholder" aria-hidden="true"></span>
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

    /* Preview nodes are static samples, not editor content, so they shouldn't
       play the block "pop" entry animation. Dozens fire at once when the menu
       opens (and again as items lazily scroll in), adding paint churn and a
       ~200ms settle that reads as lag. */
    .revision :global(.node-view) {
        animation: none;
    }

    /* Approximate one line of a rendered preview so off-screen items still
       occupy space before they lazily mount. */
    .placeholder {
        display: block;
        min-height: 1.3em;
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
        /* Keep the note's links/concept-links legible on the gold hover (#1216). */
        --wordplay-link-color: var(--color-white);
        --wordplay-link-underline-color: var(--color-orange);
    }

    /* Bound the hint so a long sentence can't widen the menu or run past two lines. */
    .note-wrap {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        max-width: 20em;
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
