<svelte:options immutable={true} />

<script lang="ts">
    import type Evaluate from '@nodes/Evaluate';
    import NodeView from './NodeView.svelte';
    import type Bind from '../../nodes/Bind';
    import {
        IdleKind,
        getCaret,
        getEditor,
        getProject,
    } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';
    import RootView from '../project/RootView.svelte';
    import ExpressionPlaceholder from '../../nodes/ExpressionPlaceholder';
    import { creator } from '../../db/Creator';

    export let node: Evaluate;

    const project = getProject();
    const caret = getCaret();
    const editor = getEditor();

    let nextBind: Bind | undefined;
    $: {
        if ($caret && $project && $caret?.isIn(node)) {
            const fun = node.getFunction($project.getNodeContext(node));
            if (fun) {
                const mapping = node.getInputMapping(fun);
                // Reset the bind.
                nextBind = undefined;
                // Loop through each of the expected types and see if the given types match.
                for (const { expected, given } of mapping.inputs) {
                    // If it's required but not given, conflict
                    if (expected.isRequired() && given === undefined) {
                        nextBind = expected;
                        break;
                    }
                }
            }
        }
    }

    function insert() {
        if ($project && $caret && nextBind) {
            const context = $project.getNodeContext(node);
            const placeholder = ExpressionPlaceholder.make(
                nextBind.getType(context).clone()
            );
            const newSource = $caret.source.replace(
                node,
                node.withBindAs(
                    nextBind.getNames()[0],
                    placeholder,
                    context,
                    false
                )
            );
            $editor(
                [
                    newSource,
                    $caret
                        .withPosition(placeholder)
                        .withSource(newSource)
                        .withAddition(placeholder),
                ],
                IdleKind.Typing
            );
        }
    }
</script>

<NodeView node={node.func} /><NodeView node={node.types} /><NodeView
    node={node.open}
/>{#each node.inputs as input}<NodeView
        node={input}
    />{/each}{#if nextBind}<span class="hint"
        >&nbsp;<Button
            tip={$creator.getLocale().ui.tooltip.addInput}
            action={() => insert()}
            ><RootView node={nextBind} inline localized inert /></Button
        ></span
    >{/if}<NodeView node={node.close} />

<style>
    .hint {
        opacity: 0.25;
    }
</style>
