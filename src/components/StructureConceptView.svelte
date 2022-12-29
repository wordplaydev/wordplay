<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import { languages } from "../models/languages";
    import Note from "./Note.svelte";
    import { fly } from "svelte/transition";
    import { selectTranslation } from "../nodes/Translations";
    import type StructureConcept from "../concepts/StructureConcept";
    import FunctionConceptView from "./FunctionConceptView.svelte";
    import BindConceptView from "./BindConceptView.svelte";
    import ConversionConceptView from "./ConversionConceptView.svelte";

    export let concept: StructureConcept;

    $: def = concept.definition;

</script>

<div class="docs" transition:fly={{ x: -200}}>
    <h1>{def.names.getTranslation($languages)}{#if def.types}<CodeView {concept} node={def.types}/>{/if}</h1>

    <p>{selectTranslation(def.getDescriptions(), $languages)}</p>

    {#if concept.examples.length > 0}
        <h2>examples</h2>
        {#each concept.examples as creator }    
            <CodeView {concept} node={creator}/>
        {/each}
    {/if}

    <h2>properties</h2>
    {#each concept.binds as bind }
        <BindConceptView concept={bind}/>
    {:else}
        <Note docs="none"/>
    {/each}

    <h2>functions</h2>
    {#each concept.functions as fun }
        <FunctionConceptView concept={fun} />
    {:else}
        <Note docs="none"/>
    {/each}

    <h2>conversions</h2>
    {#each concept.conversions as conversion }
        <ConversionConceptView concept={conversion}/>
    {:else}
        <Note docs="none"/>
    {/each}

</div>