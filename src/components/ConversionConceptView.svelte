<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type ConversionConcept from "../concepts/ConversionConcept";

    export let concept: ConversionConcept;

</script>

<CodeView {concept} node={concept.example} />