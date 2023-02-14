<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import TextLiteral from '@nodes/TextLiteral';
    import Options from '../widgets/Options.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type { OutputProperty } from '@transforms/OutputExpression';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let options: (undefined | string)[];

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                newValue ? TextLiteral.make(newValue) : undefined
            )
        );
    }
</script>

<Options value={values.getText()} {options} change={handleChange} />
