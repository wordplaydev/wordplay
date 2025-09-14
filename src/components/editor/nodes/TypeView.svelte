<!-- A fallback view of types that don't have a more specialized view, generally for type errors. -->
<script lang="ts">
    import { locales } from '@db/Database';
    import type Type from '../../../nodes/Type';
    import MarkupHTMLView from '../../concepts/MarkupHTMLView.svelte';
    import { getProject, getRoot } from '../../project/Contexts';

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
    >{#if context}<MarkupHTMLView
            markup={node.getDescription($locales, context)}
        />{:else}{node.toWordplay()}{/if}</span
>

<style>
    .TypeView {
        display: inline-block;
        font-family: var(--wordplay-app-font);
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        padding-left: var(--wordplay-spacing-half);
        padding-right: var(--wordplay-spacing-half);
        border-radius: var(--wordplay-border-radius);
    }
</style>
