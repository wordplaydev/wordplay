<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import type Concept from '@concepts/Concept';
    import GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { blocks, locales } from '@db/Database';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Type from '../../nodes/Type';
    import Spaces from '../../parser/Spaces';
    import { copyNode } from '../editor/commands/Clipboard';
    import { getConceptIndex, getDragged } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import TypeView from './TypeView.svelte';

    interface Props {
        node: Node;
        concept?: Concept | undefined;
        spaces?: Spaces | undefined;
        type?: Type | undefined;
        describe?: boolean;
        inline?: boolean;
        outline?: boolean;
        elide?: boolean;
        flip?: boolean;
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
        flip = false,
        localize = true,
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

    function copy() {
        // Copy node needs a source to manage spacing, so we make one.
        copyNode(node, getPreferredSpaces(node));
    }
</script>

{#snippet code()}
    <div class="code">
        <div
            role="textbox"
            aria-label={$locales.get(node.getLocalePath()).name}
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
            onkeydown={(event) =>
                event.key === 'c' && (event.ctrlKey || event.metaKey)
                    ? copy()
                    : undefined}
            ><RootView
                {node}
                {inline}
                {spaces}
                blocks={$blocks}
                {elide}
                locale={localize ? $locales.getLocale() : null}
                inert={!draggable}
            /></div
        >{#if type && concept}&nbsp;<TypeView
                {type}
                context={concept.context}
            />
        {/if}
    </div>
{/snippet}

{#snippet link()}
    {#if describe && concept}
        <div class="link">
            {#if concept instanceof GalleryHowConcept}
                <Link to={concept.getPath()} external>{concept.getName()}</Link>
            {:else}
                <ConceptLinkUI link={concept} symbolic={false} />
            {/if}
        </div>
    {/if}
{/snippet}

<div class="view">
    {#if flip}
        {@render link()}
        {@render code()}
    {:else}
        {@render code()}
        {@render link()}
    {/if}
</div>

<style>
    .view {
        display: inline-flex;
        flex-direction: column;
        touch-action: none;
        gap: var(--wordplay-spacing);
    }

    .node {
        display: inline-block;
        vertical-align: middle;
        user-select: none;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
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

    .node.elide {
        max-height: 10ex;
        overflow: hidden;
    }

    .node.elide.blocks {
        max-height: 20ex;
    }

    .code {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
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

    .node:not(:global(.outline)) {
        border-radius: var(--wordplay-border-radius);
    }
</style>
