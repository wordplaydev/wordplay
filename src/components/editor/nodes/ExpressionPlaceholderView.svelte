<script lang="ts">
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import { locales } from '../../../db/Database';
    import { getProject, getRoot } from '../../project/Contexts';
    import MenuTrigger from '../menu/MenuTrigger.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

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
    >{/if}<NodeView node={[node, 'dot']} empty="hide" {format} /><NodeView
    node={[node, 'type']}
    format={{ ...format, editable: false }}
/>
{#if format.editable && format.block}<MenuTrigger anchor={node} />{/if}

<style>
    .label {
        margin-inline-start: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
    }
</style>
