<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import NodeView from './NodeView.svelte';
    import type Bind from '../../nodes/Bind';
    import { getCaret, getProject, getIsBlocks } from '../project/Contexts';
    import RootView from '../project/RootView.svelte';
    import PlaceholderView from './MenuTrigger.svelte';
    import Token from '../../nodes/Token';
    import Input from '@nodes/Input';

    interface Props {
        node: Evaluate;
    }

    let { node }: Props = $props();

    const project = getProject();
    const caret = getCaret();
    const blocks = getIsBlocks();

    // The next possible bind, or undefined if there are no more binds.
    let nextBind: Bind | undefined = $state();
    let menuPosition: number | undefined = $state();

    // Update the bind and menu position when the caret, projects, etc. change
    $effect(() => {
        nextBind = undefined;
        menuPosition = undefined;
        // We only show when
        // 1) the caret is in this evaluate but not in one of it's child evaluates
        // 2) in blocks mode.
        if (
            $caret &&
            $project &&
            ($blocks ||
                ($caret.isIn(node, node.close === undefined) &&
                    !node
                        .nodes()
                        .filter(
                            (child) =>
                                child instanceof Evaluate && child !== node,
                        )
                        .some((evaluate) => $caret?.isIn(evaluate, false))))
        ) {
            const mapping = node.getInputMapping($project.getNodeContext(node));
            if (mapping) {
                // Reset the bind.
                nextBind = undefined;
                // Loop through each of the expected types and see if the given types match.
                for (const { expected, given } of mapping.inputs) {
                    // If it's required but not given, conflict
                    if (given === undefined) {
                        nextBind = expected;
                        if ($blocks) {
                            const lastLeaf = node.getLastLeaf() ?? node.close;
                            menuPosition =
                                lastLeaf instanceof Token
                                    ? $caret.source.getTokenTextPosition(
                                          lastLeaf,
                                      )
                                    : undefined;
                        } else {
                            const lastLeaf = (
                                node.getLastInput() ?? node.open
                            ).getLastLeaf();
                            menuPosition =
                                lastLeaf instanceof Token
                                    ? $caret.source.getTokenLastPosition(
                                          lastLeaf,
                                      )
                                    : undefined;
                        }
                        break;
                    }
                }
            }
        }
    });
</script>

{#if $blocks}
    <div class="evaluate">
        <NodeView node={node.fun} /><NodeView node={node.types} /><NodeView
            node={node.open}
        />
        {#each node.inputs as input}<NodeView node={input} /><PlaceholderView
                position={input instanceof Input ? input.value : input}
            />{/each}{#if nextBind}<div class="hint"
                >&nbsp;<RootView
                    node={nextBind.withoutValue()}
                    inline
                    elide
                    localized="symbolic"
                    inert
                    blocks={false}
                />{#if menuPosition}
                    &nbsp;<PlaceholderView position={menuPosition} />{/if}</div
            >{/if}
        <NodeView node={node.close} />
    </div>
{:else}
    <NodeView node={node.fun} /><NodeView node={node.types} /><NodeView
        node={node.open}
    />{#each node.inputs as input}<NodeView
            node={input}
        />{/each}{#if nextBind}<div class="hint"
            >&nbsp;<RootView
                node={nextBind.withoutValue()}
                inline
                elide
                localized="symbolic"
                inert
                blocks={$blocks}
            />{#if menuPosition}
                &nbsp;<PlaceholderView position={menuPosition} />{/if}</div
        >{/if}<NodeView node={node.close} />
{/if}

<style>
    .hint {
        display: inline-block;
    }

    .hint,
    .hint :global(.token-view) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
        font-size: small;
    }

    .evaluate {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-border-width);
    }
</style>
