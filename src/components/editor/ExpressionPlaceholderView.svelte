<svelte:options immutable={true} />

<script lang="ts">
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import NodeView from './NodeView.svelte';
    import { getProject } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import UnknownType from '../../nodes/UnknownType';

    export let node: ExpressionPlaceholder;

    const project = getProject();
    $: inferredType = $project
        ? node.getType($project.getNodeContext(node))
        : undefined;
</script>

<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        ><NodeView node={node.placeholder} /><NodeView node={node.dot} /></span
    >{#if node.type}<NodeView
            node={node.type}
        />{:else if inferredType && !(inferredType instanceof UnknownType)}<RootView
            inline
            inert
            localized
            node={inferredType}
        />{/if}</span
>

<style>
    .placeholder :global(.token-view) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }

    /* Decided not to hide type. */
    /* .hidden :global(.token-view) {
        display: inline-block;
        width: 0;
        opacity: 0;
    } */
</style>
