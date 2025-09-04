<script lang="ts">
    import type Concept from '@concepts/Concept';
    import { blocks, locales } from '@db/Database';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Type from '../../nodes/Type';
    import Spaces from '../../parser/Spaces';
    import { copyNode } from '../editor/util/Clipboard';
    import { getDragged } from '../project/Contexts';
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
    }: Props = $props();

    let dragged = getDragged();

    function handlePointerDown(event: PointerEvent) {
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
            aria-readonly="true"
            class:blocks={$blocks}
            class="node"
            class:draggable={dragged !== undefined}
            class:outline
            class:elide
            class:evaluate={node instanceof Expression &&
                node.getKind() === ExpressionKind.Evaluate}
            class:definition={node instanceof Expression &&
                node.getKind() === ExpressionKind.Definition}
            tabindex="0"
            onpointerdown={handlePointerDown}
            onkeydown={(event) =>
                event.key === 'c' && (event.ctrlKey || event.metaKey)
                    ? copy()
                    : undefined}
            ><RootView
                {node}
                {inline}
                {spaces}
                blocks={false}
                {elide}
                locale={$locales.getLocale()}
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
            <ConceptLinkUI link={concept} symbolic={false} />
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
        user-select: none;
        display: inline-block;
        vertical-align: middle;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
    }

    .draggable {
        cursor: grab;
    }

    .node.outline {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: 1px calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius)) 1px;
    }

    .node.elide {
        max-height: 5em;
        overflow: hidden;
    }

    .code {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: baseline;
    }

    .node:focus,
    .node:hover {
        background: var(--wordplay-hover);
    }

    .node:not(:global(.outline)) {
        border-radius: var(--wordplay-border-radius);
    }
</style>
