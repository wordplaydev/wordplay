<script lang="ts">
    import { slide } from "svelte/transition";
    import type Concept from "../concepts/Concept";
    import CodeView from "./CodeView.svelte";
    import { languages } from "../models/languages";
    import { selectTranslation } from "../nodes/Translations";
    import type Context from "../nodes/Context";
    import { getContext } from "svelte";

    export let concept: Concept;

    $: node = concept.getRepresentation();

    $: context = getContext<Context>("context");

</script>

<div transition:slide={{ duration: 250 }}>
    <h1><CodeView {concept} {node} describe={false} /></h1>

    <p>{selectTranslation(node.getDescriptions(concept.context ?? context), $languages)}</p>

    <slot></slot>

</div>