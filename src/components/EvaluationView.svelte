<script lang="ts">
    import FunctionDefinition from "../nodes/FunctionDefinition";
    import Program from "../nodes/Program";
    import StructureDefinition from "../nodes/StructureDefinition";
    import type Evaluation from "../runtime/Evaluation";
    import ValueView from "./ValueView.svelte";

    export let evaluation: Evaluation;

    $: bindings = evaluation.getBindings();
    $: definition = evaluation.getDefinition();

</script>

<div>
    <h3>{
        definition instanceof Program ? "Program" : 
        definition instanceof FunctionDefinition ? definition.names.getNames() :
        definition instanceof StructureDefinition ? definition.getNames() :
        definition.output.toWordplay()
        }
    </h3>
    
    <table>
    {#each [ ...bindings ] as [ key, value ] }
        <tr><td><strong>{ key }</strong></td><td><ValueView value={value}/></td></tr>
    {/each}
    </table>

    <ul>
        {#each evaluation.getValues() as value }
            <li><ValueView value={value}/></li>
        {/each}
    </ul>

</div>

<style>
    div {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>