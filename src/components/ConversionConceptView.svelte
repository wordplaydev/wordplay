<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type ConversionConcept from "../concepts/ConversionConcept";
    import ConceptView from "./ConceptView.svelte";

    export let concept: ConversionConcept;

</script>

<ConceptView {concept}>

    <h2>input</h2>
    <CodeView {concept} node={concept.definition.input} />

    <h2>output</h2>
    <CodeView {concept} node={concept.definition.output} />

</ConceptView>