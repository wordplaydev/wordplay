<script lang="ts">
    import Speech from "../components/Speech.svelte";
    import type Conflict from "../conflicts/Conflict";
    import { languages } from "../models/languages";
    import type Context from "../nodes/Context";
    import type Node from "../nodes/Node";
    import { selectTranslation } from "../nodes/Translations";

    type Claim = { node: Node, explanation: string };

    export let context: Context;
    export let conflicts: Conflict[];

    let positionedConflicts: { primary: Claim, secondary: Claim[] }[] = [];
    $: positionedConflicts = conflicts.map(conflict => {
        const nodes = conflict.getConflictingNodes();

        // Based on the primary and secondary nodes given, decide what to show.
        // We expect
        // 1) a single primary node
        // 2) zero or more secondary nodes
        // From these, we generate one or two speech bubbles to illustrate the conflict.
        return {
            conflict,
            primary: {
                node: nodes.primary,
                explanation: selectTranslation(conflict.getPrimaryExplanation(context), $languages)
            },
            secondary: nodes.secondary.map(secondary => {
                return {
                    node: secondary,
                    explanation: selectTranslation(conflict.getSecondaryExplanation(context), $languages)
                }
            })
        }   
    });


</script>

<!-- The editor underlies the tokens. This component's job is to show the explanations. -->
{#each positionedConflicts as conflict }
    <Speech node={conflict.primary.node} explanation={conflict.primary.explanation} />
    {#each conflict.secondary as secondary}
        <Speech node={secondary.node} explanation={secondary.explanation} secondary />
    {/each}
{/each}