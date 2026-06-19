<script lang="ts">
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import OutputPreview from '@components/concepts/OutputPreview.svelte';
    import TypeView from '@components/concepts/TypeView.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { copyNode } from '@components/editor/commands/Clipboard';
    import { getConceptIndex, getDragged } from '@components/project/Contexts';
    import RootView from '@components/project/RootView.svelte';
    import type Concept from '@concepts/Concept';
    import GalleryHowConcept from '@concepts/GalleryHowConcept';
    import HowConcept from '@concepts/HowConcept';
    import { blocks, locales } from '@db/Database';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import type Type from '@nodes/Type';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import Spaces from '@parser/Spaces';
    import { CONFIRM_SYMBOL } from '@parser/Symbols';

    interface Props {
        node: Node;
        concept?: Concept | undefined;
        spaces?: Spaces | undefined;
        type?: Type | undefined;
        describe?: boolean;
        inline?: boolean;
        outline?: boolean;
        elide?: boolean;
        localize?: boolean;
    }

    let {
        node,
        concept = undefined,
        spaces = undefined,
        type = undefined,
        describe = true,
        inline = false,
        outline = true,
        elide = false,
        // Examples and concept-code views default to *not* filtering by the
        // current locale — they are samples of code, so every translation
        // should be visible. Callers that want locale-aware filtering can
        // opt in by setting `localize`.
        localize = false,
    }: Props = $props();

    let dragged = getDragged();

    // Find out if the project this view is in is a real editable project.
    const index = getConceptIndex();
    const draggable = $derived(
        index !== undefined && index.index?.project.getName() !== 'guide',
    );

    function handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return; // Only primary button
        event.stopPropagation();
        // Release the implicit pointer capture so events can travel to other components.
        if (event.target instanceof Element)
            event.target.releasePointerCapture(event.pointerId);

        // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
        if (dragged) dragged.set(node.clone());
    }

    // Briefly shows a confirmation after copying, so the code views give feedback that they were copied.
    let copied = $state(false);
    let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

    function copy() {
        // Copy node needs a source to manage spacing, so we make one.
        copyNode(node, getPreferredSpaces(node));
        copied = true;
        if (copiedTimeout) clearTimeout(copiedTimeout);
        copiedTimeout = setTimeout(() => (copied = false), 1000);
    }

    // How-to concepts preview the *output* of their starred/first example (playable on
    // demand) instead of code, falling back to the code (the {@render code()} snippet) when
    // the output isn't a Stage. This is bundled here so every place that renders a concept
    // (the how-to grid, search results, …) gets it automatically.
    let isHowTo = $derived(
        concept instanceof HowConcept || concept instanceof GalleryHowConcept,
    );
    let example = $derived(
        concept instanceof HowConcept || concept instanceof GalleryHowConcept
            ? concept.getPreviewExample()
            : undefined,
    );

    // A short hint describing what the concept does, shown below the concept link
    // to help creators learn unfamiliar language constructs (see issue #1036).
    let note = $derived(concept?.getDescription($locales));

    // The output preview mounts lazily when the tile first scrolls into view, so a long list
    // of how-tos doesn't spin up dozens of evaluators at once. Latch visible (don't toggle
    // back) to avoid layout thrash. `playing` is local; OutputPreview's registry enforces
    // one-playing-at-a-time globally.
    let view = $state<HTMLElement>();
    let visible = $state(false);
    let playing = $state(false);
    $effect(() => {
        const el = view;
        if (!isHowTo || !(el instanceof HTMLElement) || visible) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    visible = true;
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    });
</script>

{#snippet code()}
    <!-- `span` rather than `div` so the element is intrinsically inline.
         Before scoped CSS applies on a hard refresh (the brief window
         where the browser has parsed the HTML but not yet the `<style>`),
         `<div>` would render as block and inline examples would briefly
         stack vertically before settling. Spans default to `inline` and
         the CSS below then upgrades them to `inline-flex` / `flex` /
         `inline-block` without a layout shift. -->
    <span class="code">
        <span
            role="textbox"
            aria-label={$locales.getPlainText(
                (l) => node.getLocalePath()(l).name,
            )}
            aria-readonly="true"
            class:blocks={$blocks}
            class="node"
            class:outline={outline && !$blocks}
            class:draggable={dragged !== undefined && draggable}
            class:elide
            class:evaluate={node instanceof Expression &&
                node.getKind() === ExpressionKind.Evaluate}
            class:definition={node instanceof Expression &&
                node.getKind() === ExpressionKind.Definition}
            tabindex={draggable ? 0 : 0}
            onpointerdown={handlePointerDown}
            onkeydown={(event) => {
                if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    copy();
                }
            }}
            ><RootView
                {node}
                {inline}
                {spaces}
                blocks={$blocks}
                {elide}
                locale={localize ? $locales.getLocale() : null}
                inert={!draggable}
            /></span
        >{#if copied}<span class="copied" aria-hidden="true"
                >{CONFIRM_SYMBOL}</span
            >{/if}{#if type && concept}&nbsp;<TypeView
                {type}
                context={concept.context}
            />
        {/if}
    </span>
{/snippet}

{#snippet link()}
    {#if describe && concept}
        <span class="link">
            <ConceptLinkUI link={concept} symbolic={false} />
        </span>
    {/if}
{/snippet}

<span class="view" class:how={isHowTo} bind:this={view}>
    {#if isHowTo && !inline}
        {#if !visible}
            <div class="placeholder"></div>
        {:else if example}
            <OutputPreview
                {example}
                {playing}
                onPlay={() => (playing = true)}
                onStop={() => (playing = false)}
            >
                {#snippet fallback()}{@render code()}{/snippet}
            </OutputPreview>
        {:else}
            {@render code()}
        {/if}
    {:else}
        {@render code()}
    {/if}
    {@render link()}
    {#if note && describe && concept && !inline && !isHowTo}
        <!-- The code's NodeView already exposes this same text via aria-label, so the
             visible hint is aria-hidden to avoid a screen reader reading it twice. -->
        <span class="note-wrap" aria-hidden="true">
            <Note inline><MarkupHTMLView markup={note} inline /></Note>
        </span>
    {/if}
</span>

<style>
    .view {
        display: inline-flex;
        flex-direction: column;
        touch-action: pan-y;
        /* Half spacing inside a preview (between code and its concept link) so the
           larger gap *between* previews reads as the segmentation boundary. */
        gap: var(--wordplay-spacing-half);
    }

    /* How-to previews show a full-width output stage, so they fill their column. */
    .view.how {
        display: flex;
        width: 100%;
    }

    /* Placeholder reserves the stage's box until the tile scrolls into view. */
    .placeholder {
        width: 100%;
        aspect-ratio: 4 / 3;
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
    }

    /* Indent the concept link to match the code's inset (the outline padding, or the
       inline node's left padding), so the link text aligns with the code text. */
    .link {
        padding-inline-start: var(--wordplay-spacing);
    }

    /* Bound the hint so a long sentence can't widen the column or run past two lines.
       Indented to align with the link/code text. The tighter line-height removes the
       extra leading the prose context would otherwise add above the first line, so the
       gap above the note matches the code→link gap. */
    .note-wrap {
        padding-inline-start: var(--wordplay-spacing);
        max-width: 20em;
        line-height: 1.25;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .node {
        display: inline-block;
        vertical-align: middle;
        user-select: none;

        /* Allow vertical scroll of parent while still delivering pointer events for drag. */
        touch-action: pan-y;
    }

    .outline {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: 1px var(--wordplay-border-radius)
            var(--wordplay-border-radius) 1px;
    }

    .draggable {
        cursor: grab;
    }

    /* Elided previews are clipped to a 2:1 box (max-width is twice max-height) so
       both tall and long samples stay compact. */
    .node.elide {
        max-height: 10ex;
        max-width: 20ex;
        overflow: hidden;
    }

    .node.elide.blocks {
        max-height: 20ex;
        max-width: 40ex;
    }

    .code {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
    }

    /* Brief confirmation that the code view was copied. */
    .copied {
        margin-inline-start: var(--wordplay-spacing-half);
        color: var(--wordplay-highlight-color);
        animation: popUp 0.3s ease-out;
    }

    @keyframes popUp {
        0% {
            transform: scale(0.5);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    .node:focus,
    .node.draggable:hover {
        outline: var(--wordplay-focus-width) solid var(--wordplay-hover);
        box-shadow: var(--color-shadow) 4px 4px 4px;
    }

    .node:focus {
        outline-color: var(--wordplay-focus-color);
        box-shadow: var(--color-shadow) 4px 4px 4px;
    }

    /* Inline examples embedded in paragraph text (the only call site that
       passes outline={false}). Give them a neutral rounded border and a
       subtle alternating background so they're visually separated from
       surrounding prose — names share the text color, so without this they
       blur into the sentence. No padding: identifiers already carry their
       own internal spacing. */
    .node:not(:global(.outline)) {
        border-radius: var(--wordplay-border-radius);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        background: var(--wordplay-alternating-color);
    }
</style>
