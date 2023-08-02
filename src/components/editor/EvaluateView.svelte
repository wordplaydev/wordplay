<svelte:options immutable={true} />

<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import NodeView from './NodeView.svelte';
    import type Bind from '../../nodes/Bind';
    import { getCaret, getProject } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import PlaceholderView from './PlaceholderView.svelte';
    import Token from '../../nodes/Token';

    export let node: Evaluate;

    const project = getProject();
    const caret = getCaret();

    // The next possible bind, or undefined if there are no more binds.
    let nextBind: Bind | undefined;
    let menuPosition: number | undefined;
    $: {
        nextBind = undefined;
        menuPosition = undefined;
        // We only show if the caret is in this evaluate, but not in one of it's child evaluates.
        if (
            $caret &&
            $project &&
            $caret.isIn(node, node.close === undefined) &&
            !node
                .nodes()
                .filter((child) => child instanceof Evaluate && child !== node)
                .some((evaluate) => $caret?.isIn(evaluate, true))
        ) {
            const fun = node.getFunction($project.getNodeContext(node));
            if (fun) {
                const mapping = node.getInputMapping(fun);
                // Reset the bind.
                nextBind = undefined;
                // Loop through each of the expected types and see if the given types match.
                for (const { expected, given } of mapping.inputs) {
                    // If it's required but not given, conflict
                    if (given === undefined) {
                        nextBind = expected;
                        const lastLeaf = (
                            node.getLastInput() ?? node.open
                        ).getLastLeaf();
                        menuPosition =
                            lastLeaf instanceof Token
                                ? $caret.source.getTokenLastPosition(lastLeaf)
                                : undefined;
                        break;
                    }
                }
            }
        }
    }
</script>

<NodeView node={node.fun} /><NodeView node={node.types} /><NodeView
    node={node.open}
/>{#each node.inputs as input}<NodeView
        node={input}
    />{/each}{#if nextBind}<span class="hint"
        >&nbsp;…<RootView
            node={nextBind}
            inline
            elide
            localized
            inert
        />{#if menuPosition}<PlaceholderView
                position={menuPosition}
            />{/if}</span
    >{/if}<NodeView node={node.close} />

<style>
    .hint,
    .hint :global(.token-view) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }
</style>
