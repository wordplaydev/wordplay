<script lang="ts">
    import { getProject } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type Node from '@nodes/Node';
    import MenuTrigger from '../menu/MenuTrigger.svelte';
    import { type Format } from '../nodes/NodeView.svelte';

    interface Props {
        /** The node containing a list of nodes to render */
        node: Node;
        /** A named field of the node type that is a list of Nodes. We permit value and node refs because markup can use them, but filter them. */
        field: string;
        /** How to handle an empty list: hide (don't render anything), label (show a localized placeholder label), menu (show a compact trigger menu) */
        style: 'hide' | 'label' | 'menu';
        /** The format to use when rendering child nodes */
        format: Format;
        /** The index in case the field is a list */
        index?: number;
    }

    let { node, field, style, format, index }: Props = $props();

    let project = getProject();

    let label = $derived(node.getFieldNamed(field)?.label);
</script>

{#if style !== 'hide'}
    <div class="empty" data-field={field}>
        {#if style === 'label' && label && $project && format.root}
            <LocalizedText
                path={label(
                    $locales,
                    /** This isn't actually correct, but it's an empty list, so it shouldn't matter */
                    node,
                    $project.getNodeContext(node),
                    format.root,
                )}
            />
        {/if}
        <MenuTrigger anchor={{ parent: node, field, index }}></MenuTrigger>
    </div>
{/if}

<style>
    .empty {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-small-font-size);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
