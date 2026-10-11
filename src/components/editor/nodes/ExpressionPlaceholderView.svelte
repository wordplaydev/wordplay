<script lang="ts">
    import AnyType from '#nodes/AnyType.ts';
    import type ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
    import { locales } from '#db/Database.ts';
    import { getProject, getRoot } from '#components/project/Contexts.ts';
    import MenuTrigger from '#components/editor/menu/MenuTrigger.svelte';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: ExpressionPlaceholder;
        format: Format;
    }

    let { node, format }: Props = $props();

    const project = getProject();

    const rootContext = getRoot();
    let root = $derived(rootContext?.root);

    /** If this has no placeholder token, then get the label for field it represents */
    let placeholder = $derived.by(() => {
        if (node.placeholder === undefined && root && $project) {
            const context = $project.getNodeContext(root.root);
            const parent = root.getParent(node);
            if (parent)
                return parent.getChildPlaceholderLabel(
                    node,
                    $locales,
                    context,
                    root,
                );
        }
        return undefined;
    });
</script>

<!-- CaretView.svelte:computeLocation depends on this structure. -->
{#if node.placeholder}<NodeView
        node={[node, 'placeholder']}
        {format}
    />{/if}{#if placeholder}<span class="label">{placeholder}</span
    >{/if}{#if !(node.type instanceof AnyType)}<span class="annotation"
        ><NodeView
            node={[node, 'dot']}
            empty="hide"
            format={{ ...format, editable: false }}
        /><NodeView
            node={[node, 'type']}
            format={{ ...format, editable: false }}
        /></span
    >{/if}{#if format.editable && format.block}<MenuTrigger
        anchor={node}
    />{/if}

<style>
    /* The expected type is a hint about the placeholder, not code, so it recedes; otherwise
       `condition•? ? yes no` reads as two conditionals. */
    .annotation {
        vertical-align: sub;
        font-size: smaller;
    }

    .annotation :global(.token-view[class*='token-category-']) {
        color: var(--wordplay-inactive-color);
    }

    .label {
        margin-inline-start: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
    }
</style>
