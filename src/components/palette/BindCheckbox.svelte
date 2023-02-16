<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type { OutputProperty } from '@transforms/OutputExpression';
    import { project, reviseProject } from '../../models/stores';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                newValue ? BooleanLiteral.make(newValue) : undefined
            )
        );
    }
</script>

<Checkbox on={values.getBool()} changed={handleChange} />
