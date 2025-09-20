<script lang="ts">
    import AnyType from '@nodes/AnyType';
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import { locales } from '../../../db/Database';
    import UnknownType from '../../../nodes/UnknownType';
    import { getCaret, getProject, getRoot } from '../../project/Contexts';
    import RootView from '../../project/RootView.svelte';
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

    const caret = getCaret();

    let inferredType = $derived(
        $project ? node.getType($project.getNodeContext(node)) : undefined,
    );

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

<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        >{#if node.placeholder}<NodeView
                node={node.placeholder}
                {format}
            />{:else if placeholder}<span class="label">{placeholder}</span
            >{/if}<NodeView node={node.dot} {format} /></span
    ><span class="type"
        >{#if node.type}<NodeView
                node={node.type}
                {format}
            />{:else if inferredType && !(inferredType instanceof UnknownType || inferredType instanceof AnyType)}•<div
                class:inferred={node.type === undefined && inferredType}
                ><RootView
                    elide
                    inert
                    inline
                    locale="symbolic"
                    node={inferredType}
                    blocks={format.block}
                /></div
            >{/if}</span
    ></span
>{#if caret}<MenuTrigger position={node} />{/if}

<style>
    .placeholder {
        color: var(--wordplay-inactive-color);
        font-size: small;
    }

    .type {
        font-size: xx-small;
    }

    .type :global(.token-view) {
        color: var(--wordplay-inactive-color);
    }

    .inferred {
        display: inline-block;
        font-style: italic;
    }

    .inferred :global(.token-view) {
        color: var(--wordplay-inactive-color);
    }

    :global(.block) .placeholder,
    :global(.block) .hidden,
    :global(.block) .type,
    :global(.block) .inferred {
        display: flex;
        flex-direction: row;
    }

    .label {
        margin-inline-start: var(--wordplay-spacing);
        font-family: var(--wordplay-app-font);
    }

    /* Decided not to hide type. */
    /* .hidden :global(.token-view) {
        display: inline-block;
        width: 0;
        opacity: 0;
    } */
</style>
