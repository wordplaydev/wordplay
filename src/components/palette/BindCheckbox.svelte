<script lang="ts">
    import type OutputProperty from '#edit/output/OutputProperty.ts';
    import type OutputPropertyValues from '#edit/output/OutputPropertyValueSet.ts';
    import BooleanLiteral from '#nodes/BooleanLiteral.ts';
    import { locales } from '#db/Database.ts';
    import { Projects } from '#db/projects/Projects.ts';
    import { getProject } from '#components/project/Contexts.ts';
    import Checkbox from '#components/widgets/Checkbox.svelte';
    import { must } from '#util/nullable.ts';

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
