<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type BindConcept from "../concepts/BindConcept";
    import { languages } from "../models/languages";
    import { getPaletteIndex } from "../editor/util/Contexts";

    export let concept: BindConcept;
    
    $: bind = concept.bind;

    let index = getPaletteIndex();
    $: type = $index.getConceptOfType(bind.getType(concept.context));

</script>

<section>
    <p class="bind">
        <CodeView {concept} node={concept.reference} /> • <CodeView concept={type ?? concept} node={type?.getRepresentation() ?? bind.getType(concept.context)}/>
    </p>
    {#if bind.docs}
        <p>
            {bind.docs.getTranslation($languages)}
        </p>
    {/if}
</section>

<style>
    .bind {
        white-space: nowrap;
    }

    section {
        margin-top: var(--wordplay-spacing);
    }
</style>