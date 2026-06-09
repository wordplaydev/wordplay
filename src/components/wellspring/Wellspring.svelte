<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import {
        getConceptGroups,
        getPurposeIcons,
        recycleDraggedNode,
    } from '@components/concepts/conceptGroups';
    import { getConceptIndex, getDragged } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Sidebar from '@components/widgets/Sidebar.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Purpose, type PurposeType } from '@concepts/Purpose';
    import {
        locales,
        Settings,
        showWellspring,
        wellspringWidth,
    } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        WELLSPRING_MAX_WIDTH,
        WELLSPRING_MIN_WIDTH,
    } from '@db/settings/WellspringSetting';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { debounced } from '@util/debounce.svelte';

    interface Props {
        /** The project whose concepts the Wellspring offers and whose source a
         *  recycled node is removed from. */
        project: Project;
    }

    let { project }: Props = $props();

    const indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);
    const dragged = getDragged();

    let isExpanded = $derived($showWellspring);
    function toggle() {
        Settings.setShowWellspring(!$showWellspring);
    }

    // --- Search -------------------------------------------------------------
    /** Fewest characters that actually run a search (matches the guide). */
    const MIN_QUERY_LENGTH = 3;
    let query = $state('');
    /** Debounced copy the search runs against, so fast typing doesn't search on
     *  every keystroke. */
    const debouncedQuery = debounced(() => query);
    /** A query is active (browse columns hidden) as soon as the field is
     *  non-empty; results only compute once it's long enough. */
    let queryActive = $derived(query.trim().length > 0);
    let results = $derived(
        debouncedQuery.current.trim().length >= MIN_QUERY_LENGTH
            ? index?.getQuery(debouncedQuery.current)
            : undefined,
    );

    // --- Browse -------------------------------------------------------------
    let purpose = $state<PurposeType>(Purpose.Outputs);
    /** The same groups the guide shows for this purpose, minus empty ones. */
    let groups = $derived(
        index
            ? getConceptGroups(purpose, index, project).filter(
                  (g) => g.concepts.length > 0,
              )
            : [],
    );

    // --- Recycle bin --------------------------------------------------------
    let dragOverBin = $state(false);

    function handleBinPointerUp() {
        const node = $dragged;
        if (dragged) dragged.set(undefined);
        dragOverBin = false;
        if (node) recycleDraggedNode(project, node);
    }

    /**
     * Pressing a preview sets the dragged node, which makes the editor light up
     * every valid drop target. The editor only clears that on its own pointerup
     * (or window blur), so a press that releases back over the Wellspring — a
     * plain click on a preview, or a drag cancelled onto the sidebar — would
     * leave the highlights stuck. Clear the dragged node here. The recycle bin's
     * own handler runs first (it recycles, then clears), so this is a no-op when
     * the release lands on the bin.
     */
    function handleSectionPointerUp() {
        if (dragged && $dragged) dragged.set(undefined);
        dragOverBin = false;
    }
</script>

<!-- The shared sidebar shell owns the frame, resize, toggle, and tooltip. The
     search is the pinned header; the browse/results scroll; the recycle bin is
     the pinned footer. -->
<Sidebar
    side="start"
    expanded={isExpanded}
    {toggle}
    width={$wellspringWidth}
    min={WELLSPRING_MIN_WIDTH}
    max={WELLSPRING_MAX_WIDTH}
    commit={(width) => Settings.setWellspringWidth(width)}
    label={(l) => l.ui.wellspring.label}
    toggleLabel={(l) => l.ui.wellspring.button.toggle}
    onpointerup={handleSectionPointerUp}
>
    {#snippet header()}
        <div class="search">
            <TextField
                id="wellspring-search"
                placeholder={SEARCH_SYMBOL}
                description={(l) => l.ui.wellspring.field.search}
                bind:text={query}
                fill
            />
            {#if query.length > 0}
                <span class="clear">
                    <Button
                        tip={(l) => l.ui.wellspring.button.clear}
                        action={() => {
                            query = '';
                        }}
                        icon="✕"
                    />
                </span>
            {/if}
        </div>
    {/snippet}

    {#snippet expandedContent()}
        <div class="code-views">
            {#if queryActive}
                {#if results}
                    {#if results.length > 0}
                        <div class="results">
                            {#each results as [concept]}
                                <ConceptPreview
                                    {concept}
                                    describe={false}
                                    node={concept.getRepresentation(
                                        $locales,
                                        true,
                                    )}
                                />
                            {/each}
                        </div>
                    {:else}
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.docs.note.noMatches}
                            /></Note
                        >
                    {/if}
                {:else}
                    <Note
                        ><LocalizedText
                            path={(l) => l.ui.docs.note.keepTyping}
                        /></Note
                    >
                {/if}
            {:else}
                <div class="browse">
                    <!-- Sticky so the category chooser stays reachable while the
                         code views scroll. -->
                    <div class="modes">
                        <Mode
                            vertical
                            labeled={false}
                            modeLabels={false}
                            modes={(l) => l.ui.docs.mode.purpose}
                            choice={Object.keys(Purpose).indexOf(purpose)}
                            select={(choice) =>
                                (purpose = Object.values(Purpose)[choice])}
                            icons={getPurposeIcons(
                                $locales.getLocale().language,
                            )}
                        />
                    </div>
                    {#if groups.length === 0}
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.wellspring.empty}
                            /></Note
                        >
                    {:else}
                        <div class="groups">
                            <!-- Repeat the guide's per-purpose headers (not
                                 bars) for clarity and consistency. -->
                            {#each groups as group}
                                <Subheader
                                    compact
                                    text={(l) => group.header(l).header}
                                />
                                {#each group.concepts as concept}
                                    <ConceptPreview
                                        {concept}
                                        describe={false}
                                        node={concept.getRepresentation(
                                            $locales,
                                            true,
                                        )}
                                    />
                                {/each}
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/snippet}

    {#snippet footer()}
        <!-- Drop a node dragged out of the editor anywhere in this pinned footer
             to delete it. The whole rectangle is the drop target; only the bin
             emoji inside reacts (wiggle + highlight). -->
        <div
            class="recycle-footer"
            role="button"
            tabindex="0"
            aria-label={$locales.getPlainText((l) => l.ui.wellspring.recycle)}
            title={$locales.getPlainText((l) => l.ui.wellspring.recycle)}
            onpointerenter={() => {
                if ($dragged) dragOverBin = true;
            }}
            onpointerleave={() => (dragOverBin = false)}
            onpointerup={handleBinPointerUp}
        >
            <div class="recycle" class:over={dragOverBin}>
                <Emoji text="🗑️" />
            </div>
        </div>
    {/snippet}
</Sidebar>

<style>
    .search {
        position: relative;
        display: block;
    }

    /* Pin the clear button to the inline-end of the search field. */
    .clear {
        position: absolute;
        inset-inline-end: var(--wordplay-spacing-half);
        top: 50%;
        transform: translateY(-50%);
    }

    /* The scrollable code-view area. Renders 20% smaller than the editor's font
       so more fits in a narrow sidebar (blocks size in em, so this scales them). */
    .code-views {
        font-size: 80%;
    }

    .results,
    .groups {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: var(--wordplay-spacing);
    }

    .browse {
        display: flex;
        flex-direction: row;
        align-items: start;
        gap: var(--wordplay-spacing);
    }

    /* Keep the category chooser visible while the code views scroll past it. */
    .modes {
        position: sticky;
        top: 0;
        align-self: flex-start;
        z-index: 1;
        background: var(--wordplay-background);
    }

    .groups {
        flex: 1;
        min-width: 0;
    }

    /* Headers (e.g. "Arrangements", "Conversions") would overflow the narrow
       sidebar at their default size, so shrink them to the small font and let
       them wrap/break rather than clip. */
    .groups :global(h2) {
        font-size: var(--wordplay-small-font-size);
        white-space: normal;
        overflow-wrap: break-word;
    }

    /* In blocks mode the preview's `.node` wrapper falls back to an
       alternating-color background + padding (the inline-example styling), which
       double-wraps the block — the block already has its own border and
       background. Strip the wrapper chrome so only the block shows. */
    .code-views :global(.view .node) {
        background: none;
        padding-inline-start: 0;
        padding-inline-end: 0;
    }

    /* The footer pins to the block-end and is demarcated from the scrolling
       content above by a top border that spans the sidebar. The recycle bin
       itself stays a centered target so its hover/wiggle reads on the emoji. */
    /* The whole footer is the drop target. */
    .recycle-footer {
        margin-block-start: auto;
        align-self: stretch;
        /* Pull out past the section's padding so the border spans edge to edge. */
        margin-inline: calc(-1 * var(--wordplay-spacing));
        margin-block-end: calc(-1 * var(--wordplay-spacing));
        display: flex;
        justify-content: center;
        padding-block: var(--wordplay-spacing);
        border-block-start: solid var(--wordplay-border-width)
            var(--wordplay-border-color);
        cursor: pointer;
    }

    .recycle-footer:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    /* Only the bin emoji reacts to a drag over the footer. */
    .recycle {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-large-font-size);
        transition: background-color calc(var(--animation-factor) * 100ms);
    }

    /* Drag-over feedback: highlight the background and wiggle on the rotation axis. */
    .recycle.over {
        background: var(--wordplay-hover);
        animation: wellspring-wiggle calc(var(--animation-factor) * 300ms)
            linear infinite;
    }

    @keyframes wellspring-wiggle {
        0% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-12deg);
        }
        75% {
            transform: rotate(12deg);
        }
        100% {
            transform: rotate(0deg);
        }
    }
</style>
