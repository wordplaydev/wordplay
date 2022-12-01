<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import FunctionValue from "../runtime/FunctionValue";
    import type Structure from "../runtime/Structure";
    import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
    import ValueView from "./ValueView.svelte";

    export let value: Structure;

    let languages = getLanguages();

    $: bindings = value.context.getBindings();
    $: definition = value.type;

</script>

<div class="structure">
    {definition.names.getTranslation($languages)} (
        {#each [ ...bindings ] as [ names, property ]}
            {#if !(property instanceof FunctionValue || property instanceof StructureDefinitionValue) }
                <div class="property">
                    {names.getTranslation($languages)}: <ValueView value={property}/>
                </div>
            {/if}
        {/each})
</div>

<style>
    .structure {
        display: inline-block;
    }

    .property {
        display: block;
        margin-left: var(--wordplay-spacing);
    }
</style>