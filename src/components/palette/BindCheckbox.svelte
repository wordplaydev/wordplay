<script lang="ts">
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import Checkbox from '../widgets/Checkbox.svelte';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import type OutputProperty from '@transforms/OutputProperty';
    import { getProject, getProjects } from '../project/Contexts';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    const project = getProject();
    const projects = getProjects();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        $projects.reviseNodes(
            $project,
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
