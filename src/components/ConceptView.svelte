<script lang="ts">
    import { slide } from "svelte/transition";
    import type Concept from "../concepts/Concept";
    import CodeView from "./CodeView.svelte";
    import { languages } from "../models/languages";
    import parseRichText from "../output/parseRichText";

    export let concept: Concept;

    $: node = concept.getRepresentation();

</script>

<div transition:slide={{ duration: 250 }}>
    <h1><CodeView {concept} {node} describe={false} /></h1>

    <p>
        {@html parseRichText(concept.getDescription($languages)).toHTML()}
    </p>

    <slot></slot>

</div>