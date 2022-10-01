<script lang="ts">
    import type Evaluation from "../runtime/Evaluation";
    import ValueView from "./ValueView.svelte";

    export let evaluation: Evaluation;

    $: bindings = evaluation.getBindings();

</script>

<div>
    <h2>{evaluation.getNode().constructor.name}</h2>
    
    <table>
    {#each [ ...bindings ] as [ key, value ] }
        <tr><td><strong>{ key }</strong></td><td><ValueView value={value}/></td></tr>
    {/each}
    </table>

</div>

<style>
    div {
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>