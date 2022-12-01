<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import FunctionDefinition from "../nodes/FunctionDefinition";
    import Program from "../nodes/Program";
    import StructureDefinition from "../nodes/StructureDefinition";
    import type Evaluation from "../runtime/Evaluation";
    import ValueView from "./ValueView.svelte";

    export let evaluation: Evaluation;

    let languages = getLanguages();

    $: bindings = evaluation.getBindings();
    $: definition = evaluation.getDefinition();

</script>

<div>
    <h3>
        {
            definition instanceof Program ? "Program" : 
            definition instanceof FunctionDefinition ? definition.names.getNames() :
            definition instanceof StructureDefinition ? definition.getNames() :
            definition.output.toWordplay()
        }
    </h3>
    
    <table>
        <tbody>
            {#each [ ...bindings ] as [ names, value ] }
                <tr>
                    <td>
                        <strong>{ names.getTranslation($languages) }</strong>
                    </td>
                    <td>
                        <ValueView value={value}/>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>

    <ul>
        {#each evaluation.getValues() as value }
            <li><ValueView value={value}/></li>
        {/each}
    </ul>

</div>

<style>
    div {
        width: 100%;
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }

    table {
        width: 100%;
    }

    td {
        vertical-align: top;
    }

</style>