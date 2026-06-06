<script lang="ts">
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales, Projects } from '@db/Database';
    import type OutputProperty from '@edit/output/OutputProperty';
    import type OutputPropertyNumber from '@edit/output/OutputPropertyNumber';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import type LocaleText from '@locale/LocaleText';
    import NumberLiteral from '@nodes/NumberLiteral';
    import NumberValue from '@values/NumberValue';
    import { tick } from 'svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        number: OutputPropertyNumber;
        editable: boolean;
        id: string;
    }

    // `property` is accepted for a uniform call site but unused here.
    let { values, number, editable, id }: Props = $props();

    let project = getProject();
    let selection = getSelectedOutput();
    let view: HTMLInputElement | undefined = $state(undefined);

    function valid(text: string) {
        const [num] = NumberValue.fromUnknown(text);
        return num.isNaN() ? (l: LocaleText) => l.ui.palette.error.nan : true;
    }

    async function handleChange(text: string) {
        if ($project === undefined) return;
        if (text.length > 0 && valid(text) !== true) return;
        Projects.revise(
            $project,
            values.getEditReplacements(
                $project,
                NumberLiteral.make(
                    text.length === 0 ? 0 : text,
                    number.unit.isEmpty() ? undefined : number.unit.clone(),
                ),
            ),
        );
        await tick();
        if (view)
            setKeyboardFocus(view, 'Restoring number field focus after edit.');
    }
</script>

<span class="number">
    <TextField
        {id}
        text={`${values.getNumber() ?? 0}`}
        validator={valid}
        {editable}
        placeholder={values.isEmpty()
            ? ''
            : $locales.getName(values.values[0].bind.names)}
        description={(l) => l.ui.palette.field.coordinate}
        changed={handleChange}
        focus={() => selection?.setAdjusting(true)}
        blur={() => selection?.setAdjusting(false)}
        bind:view
    />
    {#if !number.unit.isEmpty()}<Note>{number.unit.toWordplay()}</Note>{/if}
</span>

<style>
    .number {
        display: inline-flex;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }
</style>
