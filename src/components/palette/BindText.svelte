<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type { OutputProperty } from '@transforms/OutputExpression';
    import TextField from '../widgets/TextField.svelte';
    import { project, reviseProject } from '../../models/stores';
    import TextLiteral from '@nodes/TextLiteral';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    // Whenever the text changes, update in the project.
    function handleChange(newValue: string) {
        if ($project === undefined) return;
        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                TextLiteral.make(newValue)
            )
        );
    }
</script>

<TextField
    text={values.getText()}
    placeholder={'—'}
    {validator}
    changed={handleChange}
/>
