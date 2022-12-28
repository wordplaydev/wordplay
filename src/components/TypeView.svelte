<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type { TypeEntry } from "./TypeEntries";
    import { languages } from "../models/languages";
    import Evaluate from "../nodes/Evaluate";
    import PropertyReference from "../nodes/PropertyReference";
    import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import Reference from "../nodes/Reference";
    import Convert from "../nodes/Convert";
    import Note from "./Note.svelte";
    import { fly } from "svelte/transition";

    export let entry: TypeEntry;

    $: def = entry.definition;

</script>

<div class="docs" transition:fly={{ x: -200}}>
    <h1>{def.names.getTranslation($languages)}</h1>

    <p>{def.getDescriptions().eng}</p>

    <h2>examples</h2>
    {#each entry.creators as creator }    
        <CodeView node={creator}/>
    {/each}

    <h2>inputs</h2>
    {#each def.inputs as input }    
        <p>
            <em>{input.names.getTranslation($languages)}</em> 
            <br/>{#if input.type}<CodeView node={input.type} docs={false}/>{/if}
            {#if input.docs}<Note docs={input.docs.getTranslation($languages)} />{/if}
        </p>
    {:else}
        <Note docs="none"/>
    {/each}

    <h2>properties</h2>
    {#each def.inputs as input }    
        <CodeView node={input}/>
    {:else}
        <Note docs="none"/>
    {/each}

    <h2>code</h2>
    {#each entry.constructs as node }
        <CodeView {node}/>
    {/each}

    <h2>functions</h2>
    {#each def.getFunctions() as fun }
        <CodeView node={
            Evaluate.make(
                PropertyReference.make(new ExpressionPlaceholder(), Reference.make(fun.names.getTranslation($languages))),
                fun.inputs.filter(input => !input.hasDefault()).map(() => new ExpressionPlaceholder())
            )
        }/>
    {/each}

    <h2>conversions</h2>
    {#each def.getAllConversions() as conversion }
        <CodeView node={Convert.make(ExpressionPlaceholder.make(), conversion.output.clone())}/>
    {/each}

</div>