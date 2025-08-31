<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import Input from '@nodes/Input';
    import type Bind from '../../../nodes/Bind';
    import Token from '../../../nodes/Token';
    import { getCaret, getProject } from '../../project/Contexts';
    import Block from '../blocks/Block.svelte';
    import Delimiter from '../blocks/Delimiter.svelte';
    import PlaceholderView from '../menu/MenuTrigger.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Evaluate;
        format: Format;
    }

    let { node, format }: Props = $props();

    const project = getProject();
    const caret = getCaret();

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
            (format.block ||
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
                    if (given === undefined) {
                        nextBind = expected;
                        if (format.block) {
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

{#if format.block}
    <Block style="evaluate" inline>
        <NodeView node={node.fun} {format} />
        <NodeView node={node.types} {format} />
        <Delimiter token={node.open} {format} />
        {#each node.inputs as input}<NodeView
                node={input}
                {format}
            /><PlaceholderView
                position={input instanceof Input ? input.value : input}
            />{/each}<!-- {#if nextBind}
            <div class="hint"
                ><div class="name"
                    ><RootView
                        node={nextBind.withoutValue()}
                        inline
                        elide
                        locale="symbolic"
                        inert
                        blocks={false}
                    /></div
                ></div
            >{/if} -->{#if nextBind && menuPosition}
            &nbsp;<PlaceholderView position={menuPosition} />
        {/if}
        <Delimiter token={node.close} {format} />
    </Block>
{:else}
    <NodeView node={node.fun} {format} /><NodeView
        node={node.types}
        {format}
    /><NodeView
        node={node.open}
        {format}
    />{#each node.inputs as input}<NodeView
            node={input}
            {format}
        />{/each}<!-- {#if nextBind}
        <div class="hint"
            ><div class="name"
                ><RootView
                    node={nextBind.withoutValue()}
                    inline
                    elide
                    locale="symbolic"
                    inert
                    blocks={$blocks}
                /></div
            ></div
        >{/if} -->{#if nextBind && menuPosition}
        &nbsp;<PlaceholderView position={menuPosition} />
    {/if}<NodeView node={node.close} {format} />
{/if}

<style>
    /* .hint {
        display: inline-block;
        position: relative;
        width: 0;
        height: 1em;
        z-index: 2;
    }
    .name {
        position: absolute;
        left: 0;
        top: 1em;
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid
            var(--wordplay-inactive-color);
    }

    .hint,
    .hint :global(.token-view) {
        color: var(--wordplay-inactive-color);
        font-style: italic;
        font-size: small;
    } */
</style>
