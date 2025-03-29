<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales, Projects } from '@db/Database';
    import type OutputProperty from '@edit/OutputProperty';
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import {
        getLanguageQuoteClose,
        getLanguageQuoteOpen,
    } from '@locale/LanguageCode';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Language from '@nodes/Language';
    import TextLiteral from '@nodes/TextLiteral';
    import { parseFormattedLiteral } from '@parser/parseExpression';
    import { FORMATTED_SYMBOL } from '@parser/Symbols';
    import { toTokens } from '@parser/toTokens';
    import MarkupValue from '@values/MarkupValue';
    import { tick } from 'svelte';
    import { getProject } from '../project/Contexts';
    import TextField from '../widgets/TextField.svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        validator: (text: string) => LocaleTextAccessor | true;
        editable: boolean;
        id: string;
    }

    let { property, values, validator, editable, id }: Props = $props();

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
                property.getName($locales),
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
        text={values.getText() ?? ''}
        description={(l) => l.ui.palette.field.text}
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
