<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type BindConcept from "../concepts/BindConcept";
    import { languages } from "../models/languages";
    import Note from "./Note.svelte";

    export let concept: BindConcept;
    
    $: bind = concept.bind;

</script>

<p>
    <em>{bind.names.getTranslation($languages)}</em> 
    <br/>{#if concept.context}<CodeView {concept} node={bind.getType(concept.context)} describe={false}/>{/if}
    {#if bind.docs}<Note docs={bind.docs.getTranslation($languages)} />{/if}
</p>
