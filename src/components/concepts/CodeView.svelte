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

    export let node: Node;
    export let concept: Concept | undefined = undefined;
    export let spaces: Spaces | undefined = undefined;
    export let type: Type | undefined = undefined;
    export let describe = true;
    export let inline = false;
    export let outline = true;

    let dragged = getDragged();

    function handlePointerDown(event: PointerEvent) {
        // Release the implicit pointer capture so events can travel to other components.
        if (event.target instanceof Element)
            event.target.releasePointerCapture(event.pointerId);

        // Set the dragged node to a deep clone of the (it may contain nodes from declarations that we don't want leaking into the program);
        dragged.set(node.clone());
    }

    function copy() {
        // Copy node needs a source to manage spacing, so we make one.
        copyNode(node, Spaces.withPreferredSpace(node));
    }
</script>

<div class="view">
    <div class="code">
        <div
            role="textbox"
            aria-readonly="true"
            class="draggable node"
            class:outline
            tabindex="0"
            on:pointerdown|stopPropagation={handlePointerDown}
            on:keydown={(event) =>
                event.key === 'c' && (event.ctrlKey || event.metaKey)
                    ? copy()
                    : undefined}><RootView {node} {inline} {spaces} /></div
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
        cursor: grab;
        user-select: none;
        display: inline-block;
        vertical-align: middle;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
    }

    .node.outline {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius)
            calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius))
            var(--wordplay-border-radius);
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

    .node:not(.outline) {
        border-radius: var(--wordplay-border-radius);
    }

    .link {
        margin-left: var(--wordplay-spacing);
        margin-top: calc(var(--wordplay-spacing) / 2);
    }
</style>
