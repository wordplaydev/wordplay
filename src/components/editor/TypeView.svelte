<!-- A fallback view of types that don't have a more specialized view, generally for type errors. -->
<script lang="ts">
    import { getProject, getRoot } from '../project/Contexts';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import type Type from '../../nodes/Type';

    interface Props {
        node: Type;
    }

    let { node }: Props = $props();

    let project = getProject();

    const rootContext = getRoot();
    let root = $derived(rootContext?.root);

    let context = $derived(
        root === undefined || $project === undefined
            ? undefined
            : $project.getNodeContext(root.root),
    );
</script>

<span class="TypeView"
    >{#if context}<MarkupHtmlView
            markup={node.getDescription($locales, context)}
        />{:else}{node.toWordplay()}{/if}</span
>

<style>
    .TypeView {
        display: inline-block;
        font-family: var(--wordplay-app-font);
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        padding-left: calc(var(--wordplay-spacing) / 2);
        padding-right: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
    }
</style>
