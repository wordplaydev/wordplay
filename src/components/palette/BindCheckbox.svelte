<script lang="ts">
    import type OutputProperty from '@edit/output/OutputProperty';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import BooleanLiteral from '@nodes/BooleanLiteral';
    import { locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import { getProject } from '@components/project/Contexts';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import { must } from '@util/nullable';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        editable: boolean;
        id?: string | undefined;
    }

    let { property, values, editable, id = undefined }: Props = $props();

    const project = getProject();

    // Whenever the text changes, update in the project.
    function handleChange(newValue: boolean | undefined) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            values.getEditReplacements(
                $project,
                newValue !== undefined
                    ? BooleanLiteral.make(newValue)
                    : undefined,
            ),
        );
    }
</script>

<Checkbox
    label={() =>
        // A property's name list always has a first name.
        must(
            $locales.getTextStructure(property.name)[0],
            "the property's name",
        )}
    on={values.getBool()}
    changed={handleChange}
    {editable}
    {id}
/>
