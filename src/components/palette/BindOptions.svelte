<script lang="ts">
    import type OutputProperty from '@edit/OutputProperty';
    import type OutputPropertyOptions from '@edit/OutputPropertyOptions';
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import { locales, Projects } from '../../db/Database';
    import { getProject } from '../project/Contexts';
    import Options from '../widgets/Options.svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        options: OutputPropertyOptions;
        editable: boolean;
        id?: string | undefined;
    }

    let {
        property,
        values,
        options,
        editable,
        id = undefined,
    }: Props = $props();

    let project = getProject();

    // Whenever the drop down value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName($locales),
                newValue ? options.fromText(newValue) : undefined,
            ),
        );
    }
</script>

<Options
    {id}
    label={property.name}
    value={options.toText(values.getExpression())}
    width="7em"
    options={[
        ...(options.allowNone ? [{ value: undefined, label: '—' }] : []),
        ...options.values.map((option) => {
            return { value: option.value, label: option.label };
        }),
    ]}
    change={handleChange}
    {editable}
/>
