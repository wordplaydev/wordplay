<svelte:options immutable={true} />

<!-- A fallback view of types that don't have a more specialized view, generally for type errors. -->
<script lang="ts">
    import type AnyType from '@nodes/AnyType';
    import concretize from '../../locale/concretize';
    import { getProject, getRoot } from '../project/Contexts';
    import { creator } from '../../db/Creator';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';

    export let node: AnyType;

    let project = getProject();
    let root = getRoot();

    $: context =
        $root === undefined || $project === undefined
            ? undefined
            : $project.getNodeContext($root.root);
</script>

<span
    >{#if context}<MarkupHtmlView
            markup={node.getDescription(
                concretize,
                $creator.getLocale(),
                context
            )}
        />{:else}{node.toWordplay()}{/if}</span
>

<style>
    span {
        display: inline-block;
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        padding-left: calc(var(--wordplay-spacing) / 2);
        padding-right: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
    }
</style>
