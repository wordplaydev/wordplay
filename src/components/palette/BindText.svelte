<script lang="ts">
    import setKeyboardFocus from '#components/util/setKeyboardFocus.ts';
    import { locales } from '#db/Database.ts';
    import { Projects } from '#db/projects/Projects.ts';
    import type OutputProperty from '#edit/output/OutputProperty.ts';
    import type OutputPropertyValues from '#edit/output/OutputPropertyValueSet.ts';
    import {
        getLanguageQuoteClose,
        getLanguageQuoteOpen,
    } from '#locale/LanguageCode.ts';
    import type { LocaleTextAccessor } from '#locale/Locales.ts';
    import Language from '#nodes/Language.ts';
    import TextLiteral from '#nodes/TextLiteral.ts';
    import { parseFormattedLiteral } from '#parser/parseExpression.ts';
    import { FORMATTED_SYMBOL } from '#parser/Symbols.ts';
    import { toTokens } from '#parser/toTokens.ts';
    import MarkupValue from '#values/MarkupValue.ts';
    import { tick } from 'svelte';
    import {
        getProject,
        getSelectedOutput,
    } from '#components/project/Contexts.ts';
    import TextField from '#components/widgets/TextField.svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        validator: (text: string) => LocaleTextAccessor | true;
        editable: boolean;
        id: string;
        /** Optional `data-uiid` for tour or tutorial targeting; left to the
         * caller because each BindText represents a distinct property. */
        uiid?: string | undefined;
    }

    // `property` is accepted for a uniform call site but unused here.
    let { values, validator, editable, id, uiid = undefined }: Props = $props();

    let project = getProject();
    let selection = getSelectedOutput();
    let view: HTMLInputElement | undefined = $state(undefined);

    let isMarkup = $derived(values.getValue() instanceof MarkupValue);

    // Whenever the text changes, update in the project.
    async function handleChange(newValue: string) {
        if ($project === undefined) return;
        Projects.revise(
            $project,
            values.getEditReplacements(
                $project,
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
    /** The bound property's name, shown as the field's placeholder. An empty
     *  set of values has no property to name. */
    function placeholderName(): string {
        const first = values.values[0];
        return first === undefined ? '' : $locales.getName(first.bind.names);
    }
</script>

<div class="text" data-uiid={uiid}>
    {isMarkup
        ? FORMATTED_SYMBOL
        : getLanguageQuoteOpen($locales.getLocale().language)}
    <TextField
        text={values.getText() ?? ''}
        description={(l) => l.ui.palette.field.text}
        placeholder={placeholderName()}
        {validator}
        changed={handleChange}
        focus={() => selection?.setAdjusting(true)}
        blur={() => selection?.setAdjusting(false)}
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
