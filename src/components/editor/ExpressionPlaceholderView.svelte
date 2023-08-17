<svelte:options immutable={true} />

<script lang="ts">
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import NodeView from './NodeView.svelte';
    import { getCaret, getProject } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import UnknownType from '../../nodes/UnknownType';
    import PlaceholderView from './PlaceholderView.svelte';

    export let node: ExpressionPlaceholder;

    const project = getProject();
    const caret = getCaret();
    $: inferredType = $project
        ? node.getType($project.getNodeContext(node))
        : undefined;
</script>

<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        ><NodeView node={node.placeholder} /><NodeView node={node.dot} /></span
    ><span class="type"
        >{#if node.type}<NodeView
                node={node.type}
            />{:else if inferredType && !(inferredType instanceof UnknownType)}<span
                >•</span
            ><RootView
                inline
                elide
                inert
                localized
                node={inferredType}
            />{/if}{#if caret}<PlaceholderView position={node} />{/if}</span
    ></span
>

<style>
    .placeholder,
    .placeholder :global(.token-view) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }

    .type :global(.token-view) {
        font-size: smaller;
    }

    /* Decided not to hide type. */
    /* .hidden :global(.token-view) {
        display: inline-block;
        width: 0;
        opacity: 0;
    } */
</style>
