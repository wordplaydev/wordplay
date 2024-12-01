<script lang="ts">
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import TextLiteral from '@nodes/TextLiteral';
    import TextField from '../widgets/TextField.svelte';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { locales, Projects } from '@db/Database';
    import { tick } from 'svelte';
    import Language from '@nodes/Language';
    import { parseFormattedLiteral } from '@parser/parseExpression';
    import { toTokens } from '@parser/toTokens';
    import MarkupValue from '@values/MarkupValue';
    import { FORMATTED_SYMBOL } from '@parser/Symbols';
    import {
        getLanguageQuoteClose,
        getLanguageQuoteOpen,
    } from '@locale/LanguageCode';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        validator: (text: string) => boolean;
        editable: boolean;
        id?: string | undefined;
    }

    let {
        property,
        values,
        validator,
        editable,
        id = undefined,
    }: Props = $props();

    let project = getProject();
    let view: HTMLInputElement | undefined = $state(undefined);

    let isMarkup = $derived(values.getValue() instanceof MarkupValue);

    // Whenever the text changes, update in the project.
    async function handleChange(newValue: string) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                isMarkup
                    ? parseFormattedLiteral(
                          toTokens(
                              FORMATTED_SYMBOL + newValue + FORMATTED_SYMBOL,
                          ),
                      )
                    : TextLiteral.make(
                          newValue,
                          Language.make($locales.getLanguages()[0]),
                      ),
            ),
        );

        await tick();
        if (view)
            setKeyboardFocus(
                view,
                'Restoring bind text editor focus after edit.',
            );
    }
</script>

<div class="text">
    {isMarkup
        ? FORMATTED_SYMBOL
        : getLanguageQuoteOpen($locales.getLocale().language)}
    <TextField
        text={values.getText()}
        description={$locales.get((l) => l.ui.palette.field.text)}
        placeholder={values.isEmpty()
            ? ''
            : $locales.getName(values.values[0].bind.names)}
        {validator}
        changed={handleChange}
        bind:view
        {editable}
        {id}
    />
    {isMarkup
        ? FORMATTED_SYMBOL
        : getLanguageQuoteClose($locales.getLocale().language)}
</div>

<style>
    .text {
        display: inline;
    }
</style>
