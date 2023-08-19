<script lang="ts">
    import Options from '../widgets/Options.svelte';
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import type OutputProperty from '@edit/OutputProperty';
    import type OutputPropertyOptions from '@edit/OutputPropertyOptions';
    import { getProject } from '../project/Contexts';
    import { Projects } from '../../db/Database';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let options: OutputPropertyOptions;
    export let editable: boolean;

    let project = getProject();

    // Whenever the drop down value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
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
    {editable}
/>
