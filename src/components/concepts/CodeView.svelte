<script lang="ts">
    import type Concept from '@concepts/Concept';
    import RootView from '../project/RootView.svelte';
    import { getDragged } from '../project/Contexts';
    import type Node from '@nodes/Node';
    import TypeView from './TypeView.svelte';
    import { copyNode } from '../editor/util/Clipboard';
    import type Type from '../../nodes/Type';
    import Spaces from '../../parser/Spaces';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import { blocks } from '@db/Database';

    interface Props {
        node: Node;
        concept?: Concept | undefined;
        spaces?: Spaces | undefined;
        type?: Type | undefined;
        describe?: boolean;
        inline?: boolean;
        outline?: boolean;
    }

    let {
        node,
        concept = undefined,
        spaces = undefined,
        type = undefined,
        describe = true,
        inline = false,
        outline = true,
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

<div class="view">
    <div class="code">
        <div
            role="textbox"
            aria-readonly="true"
            class:blocks={$blocks}
            class:node
            class:draggable={dragged !== undefined}
            class:outline
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
                inline={inline || $blocks}
                {spaces}
                blocks={$blocks}
            /></div
        >{#if type && concept}&nbsp;<TypeView
                {type}
                context={concept.context}
            />
        {/if}
    </div>
    {#if describe && concept}
        <div class="link">
            <ConceptLinkUI link={concept} symbolic={false} />
        </div>
    {/if}
</div>

<style>
    .view {
        display: inline-block;
        touch-action: none;
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

    .link {
        margin-left: var(--wordplay-spacing);
        margin-top: calc(var(--wordplay-spacing) / 2);
    }
</style>
