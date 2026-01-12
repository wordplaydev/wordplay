<script lang="ts">
    import { getProject } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import Caret from '@edit/caret/Caret';
    import type Node from '@nodes/Node';
    import { enumerateSymbols } from '@nodes/Node';
    import Token from '@nodes/Token';
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
        /** Whether the empty view is currently being inserted into */
        inserting?: boolean;
    }

    let {
        node,
        field,
        style,
        format,
        index,
        inserting = false,
    }: Props = $props();

    let project = getProject();

    let fieldInfo = $derived(node.getFieldNamed(field));
    let kinds = $derived(fieldInfo ? enumerateSymbols(fieldInfo) : []);
</script>

{#if style !== 'hide'}
    <div
        class="empty"
        class:blockText={format.editable &&
            kinds.some((kind) =>
                Caret.isTokenTextBlockEditable(new Token('', kind), node),
            )}
        class:inserting
        data-nodeid={node.id}
        data-field={field}
    >
        {#if style === 'label' && $project && format.root}
            {@const label = fieldInfo?.label}
            {#if label}
                <LocalizedText
                    path={label(
                        $locales,
                        $project.getNodeContext(node),
                        undefined,
                        format.root,
                    )}
                />
            {/if}
        {/if}
        {#if format.editable}
            <MenuTrigger anchor={{ parent: node, field, index }}></MenuTrigger>
        {/if}
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
        border-radius: var(--wordplay-border-radius);
    }

    .inserting {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
    }

    .blockText {
        border-bottom: solid var(--wordplay-focus-width)
            var(--wordplay-border-color);
    }
</style>
