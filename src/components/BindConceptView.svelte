<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type BindConcept from "../concepts/BindConcept";
    import { languages } from "../models/languages";
    import Note from "./Note.svelte";
    import { getContext } from "svelte";
    import type Context from "../nodes/Context";

    export let concept: BindConcept;
    
    $: bind = concept.bind;

    $: context = getContext<Context>("context");

</script>

<p>
    <em>{bind.names.getTranslation($languages)}</em> <CodeView {concept} node={bind.getType(concept.context ?? context)} describe={false}/>
    <br/>{#if bind.docs}<Note>{bind.docs.getTranslation($languages)}</Note>{/if}
</p>