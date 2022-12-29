<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type BindConcept from "../concepts/BindConcept";
    import { languages } from "../models/languages";
    import Note from "./Note.svelte";

    export let concept: BindConcept;
    
    $: bind = concept.bind;

</script>

<p>
    <em>{bind.names.getTranslation($languages)}</em>: <CodeView {concept} node={bind.getType(concept.context)} describe={false} border={false}/>
    <br/>{#if bind.docs}<Note>{bind.docs.getTranslation($languages)}</Note>{/if}
</p>