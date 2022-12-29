<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type FunctionConcept from "../concepts/FunctionConcept";

    export let concept: FunctionConcept;

</script>

<CodeView {concept} node={concept.example} />
{#if concept.context}
    <CodeView {concept} node={concept.definition.getType(concept.context)} />
{/if}