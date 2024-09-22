<svelte:options immutable={true} />

<script lang="ts">
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import NodeView from './NodeView.svelte';
    import {
        getCaret,
        getProject,
        getRoot,
        isBlocks,
    } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import UnknownType from '../../nodes/UnknownType';
    import PlaceholderView from './MenuTrigger.svelte';
    import { locales } from '../../db/Database';
    import AnyType from '@nodes/AnyType';

    export let node: ExpressionPlaceholder;

    const project = getProject();
    const root = getRoot();
    const caret = getCaret();
    const blocks = isBlocks();

    $: inferredType = $project
        ? node.getType($project.getNodeContext(node))
        : undefined;

    /** If this has no placeholder token, then get the label for field it represents */
    let placeholder: string | undefined;
    $: {
        if (node.placeholder === undefined && $root && $project) {
            const context = $project.getNodeContext($root.root);
            const parent = $root.getParent(node);
            if (parent)
                placeholder = parent.getChildPlaceholderLabel(
                    node,
                    $locales,
                    context,
                    $root,
                );
        } else placeholder = undefined;
    }
</script>

<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        >{#if node.placeholder}<NodeView
                node={node.placeholder}
            />{:else if placeholder}<span class="label">{placeholder}</span
            >{/if}<NodeView node={node.dot} /></span
    ><span class="type"
        >{#if node.type}<NodeView
                node={node.type}
            />{:else if inferredType && !(inferredType instanceof UnknownType || inferredType instanceof AnyType)}•<div
                class:inferred={node.type === undefined && inferredType}
                ><RootView
                    elide
                    inert
                    inline
                    localized="symbolic"
                    node={inferredType}
                    blocks={$blocks}
                /></div
            >{/if}</span
    ></span
>{#if caret}<PlaceholderView position={node} />{/if}

<style>
    .placeholder {
        color: var(--wordplay-inactive-color);
        font-style: italic;
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
        animation: bob infinite linear 1s;
        transform-origin: left;
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

    @keyframes bob {
        0% {
            transform: rotate(-10deg);
        }
        50% {
            transform: rotate(10deg);
        }
        100% {
            transform: rotate(-10deg);
        }
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
