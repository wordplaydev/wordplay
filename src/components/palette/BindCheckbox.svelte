<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import type OutputProperty from '@transforms/OutputProperty';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import { reviseProject } from '../project/project';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    let project = getProject();
    let selectedOutput = getSelectedOutput();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined || selectedOutput === undefined) return;
        reviseProject(
            project,
            selectedOutput,
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
