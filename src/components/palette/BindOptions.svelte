<script lang="ts">
    import Options from '../widgets/Options.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type OutputProperty from '@transforms/OutputProperty';
    import type OutputPropertyOptions from '@transforms/OutputPropertyOptions';
    import { getProject, getProjects } from '../project/Contexts';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let options: OutputPropertyOptions;

    let project = getProject();
    let projects = getProjects();

    // Whenever the drop down value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        $projects.reviseNodes(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                newValue ? options.fromText(newValue) : undefined
            )
        );
    }
</script>

<Options
    value={options.toText(values.getExpression())}
    options={options.allowNone
        ? [undefined, ...options.values]
        : options.values}
    change={handleChange}
/>
