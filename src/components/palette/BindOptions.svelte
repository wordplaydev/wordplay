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
                newValue ? options.fromText(newValue) : undefined,
            ),
        );
    }
</script>

<Options
    id={property.getName()}
    label={property.getName()}
    value={options.toText(values.getExpression())}
    width="7em"
    options={[
        ...(options.allowNone ? [{ value: undefined, label: '—' }] : []),
        ...options.values.map((value) => {
            return { value, label: value };
        }),
    ]}
    change={handleChange}
    {editable}
/>
