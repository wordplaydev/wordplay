<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import { project, reviseProject } from '@models/stores';
    import type OutputProperty from '@transforms/OutputProperty';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                newValue !== undefined
                    ? BooleanLiteral.make(newValue)
                    : undefined
            )
        );
    }
</script>

<Checkbox on={values.getBool()} changed={handleChange} />
