<script lang="ts">
    import Options from '../widgets/Options.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type OutputProperty from '@transforms/OutputProperty';
    import type OutputPropertyOptions from '@transforms/OutputPropertyOptions';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import { reviseProject } from '../project/project';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let options: OutputPropertyOptions;

    let project = getProject();
    let selectedOutput = getSelectedOutput();

    // Whenever the drop down value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined || selectedOutput === undefined) return;
        reviseProject(
            project,
            selectedOutput,
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
