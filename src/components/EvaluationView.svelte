<script lang="ts">
    import ConversionDefinition from "../nodes/ConversionDefinition";
    import FunctionDefinition from "../nodes/FunctionDefinition";
    import Program from "../nodes/Program";
    import StructureDefinition from "../nodes/StructureDefinition";
    import type Evaluation from "../runtime/Evaluation";

    export let evaluation: Evaluation;

    $: definition = evaluation.getDefinition();

</script>

<div>
    <h3>
        {
            definition instanceof Program ? "Program" : 
            definition instanceof FunctionDefinition ? definition.names.getNames() :
            definition instanceof StructureDefinition ? definition.getNames() :
            definition instanceof ConversionDefinition ? definition.output.toWordplay() :
            definition.getNames()
        }
    </h3>
</div>

<style>
    div {
        width: 100%;
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
        box-sizing: border-box;
    }
</style>