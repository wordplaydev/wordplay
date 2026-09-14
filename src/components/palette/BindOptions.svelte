<script lang="ts">
    import { type Face } from '@basis/faces/Fonts';
    import FaceName from '@components/settings/FaceName.svelte';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyOptions from '@edit/output/OutputPropertyOptions';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import { locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import { getProject } from '@components/project/Contexts';
    import Options from '@components/widgets/Options.svelte';
    import { must } from '@util/nullable';

    /** The one property whose options carry more than a label: a typeface
     *  option previews the face itself. */
    type FaceOption = { face: { name: string; face: Face } };
    type EmptyOption = Record<string, never>;

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        options: OutputPropertyOptions<FaceOption | EmptyOption>;
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
            values.getEditReplacements(
                $project,
                newValue ? options.fromText(newValue) : undefined,
            ),
        );
    }
</script>

<Options
    {id}
    label={() => must(property.getName($locales), "the property's name")}
    value={options.toText(values.getExpression())}
    width="7em"
    options={[
        ...(options.allowNone ? [{ value: undefined, label: '—' }] : []),
        ...options.values,
    ]}
    change={handleChange}
    {editable}
>
    {#snippet item(option, localized)}
        {@const face = 'face' in option ? option.face : undefined}
        {#if face !== undefined}
            <FaceName name={face.name} face={face.face} />
        {:else}
            {@render localized(option.label)}
        {/if}
    {/snippet}
</Options>
