<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { config } from '../../db/Creator';
    import { tick } from 'svelte';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let validator: (text: string) => boolean;

    let project = getProject();
    let view: HTMLInputElement | undefined = undefined;

    // Whenever the text changes, update in the project.
    async function handleChange(newValue: string) {
        if ($project === undefined) return;
        $config.reviseProjectNodes(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                TextLiteral.make(newValue)
            )
        );

        await tick();
        view?.focus();
    }
</script>

<TextField
    text={values.getText()}
    description={$config.getLocale().ui.description.editTextOutput}
    placeholder={values.isEmpty()
        ? ''
        : values.values[0].bind.names.getLocaleText($config.getLanguages())}
    {validator}
    changed={handleChange}
    bind:view
/>
