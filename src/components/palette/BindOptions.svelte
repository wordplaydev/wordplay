<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import Options from '../widgets/Options.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type { OutputProperty } from '@transforms/OutputExpression';
    import type OutputPropertyOptions from '@transforms/OutputPropertyOptions';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let options: OutputPropertyOptions;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        reviseProject(
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
