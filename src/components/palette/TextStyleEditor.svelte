<script lang="ts">
    import type Project from '@models/Project';
    import Options from '@components/widgets/Options.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import {
        CODE_SYMBOL,
        DOCUMENTATION_SYMBOL,
        FORMATTED_SYMBOL,
        ITALIC_SYMBOL,
        UNDERSCORE_SYMBOL,
    } from '@parser/Symbols';
    import { getConceptIndex } from '@components/project/Contexts';
    import NamedControl from './NamedControl.svelte';
    import OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import MarkupValue from '@values/MarkupValue';
    import { Projects, locales } from '@db/Database';
    import TextLiteral from '@nodes/TextLiteral';
    import FormattedLiteral from '@nodes/FormattedLiteral';
    import type Expression from '@nodes/Expression';
    import Example from '@nodes/Example';
    import Translation from '@nodes/Translation';
    import Token from '@nodes/Token';
    import Sym from '@nodes/Sym';
    import { toTokens } from '@parser/toTokens';
    import { getLanguageQuoteClose } from '@locale/LanguageCode';
    import { parseFormattedTranslation } from '@parser/parseExpression';

    export let project: Project;
    export let outputs: OutputPropertyValueSet;

    const weights: Record<string, string> = {
        light: '~',
        normal: '',
        bold: '*',
        extra: '^',
    };

    // Get a link to the phrase concept, which explains how formatting works.
    let index = getConceptIndex();
    $: concept = $index?.getStructureConcept(
        project.basis.shares.output.Phrase,
    );

    // It's formatted if all of the selected outputs are a markup value. If some are, formatted is undefined.
    $: textValue = outputs.getValue();
    $: markupValue = textValue instanceof MarkupValue ? textValue : undefined;
    $: formatted = markupValue ? true : textValue ? false : undefined;
    $: formats = markupValue?.markup.paragraphs[0]?.getFormats();
    $: weight = formats?.find((format) => format in weights) ?? 'normal';

    // Account for italics inside the text, rather than wrapping it, passing indeterminate state to checkbox.
    $: italic =
        formats && formats.includes('italic')
            ? true
            : textValue?.toWordplay().includes(ITALIC_SYMBOL)
              ? undefined
              : false;
    // Account for underscores inside the text, rather than wrapping it, passing indeterminate state to checkbox.
    $: underlined =
        formats && formats.includes('underline')
            ? true
            : textValue?.toWordplay().includes(UNDERSCORE_SYMBOL)
              ? undefined
              : false;

    // Given some format, apply it if not applied, and remove it if applied.
    function applyStyle(format: 'italic' | 'underline') {
        const delimiter =
            format === 'italic'
                ? ITALIC_SYMBOL
                : format === 'underline'
                  ? UNDERSCORE_SYMBOL
                  : undefined;
        if (
            markupValue === undefined ||
            formats === undefined ||
            delimiter === undefined
        )
            return;
        let newMarkup: string;
        // Already included? Remove it.
        if (formats.includes(format))
            newMarkup = markupValue.markup
                .toWordplay()
                .replaceAll(delimiter, '');
        // Not included yet? Remove any existing delimiters and wrap it.
        else
            newMarkup =
                delimiter +
                markupValue.markup.toWordplay().replaceAll(delimiter, '') +
                delimiter;

        Projects.revise(
            project,
            project.getBindReplacements(
                outputs.getExpressions(),
                outputs.property.getName(),
                new FormattedLiteral([
                    parseFormattedTranslation(
                        toTokens(
                            FORMATTED_SYMBOL + newMarkup + FORMATTED_SYMBOL,
                        ),
                    ),
                ]),
            ),
        );
    }

    // Given some weight, remove any existing weight and apply the new one.
    function applyWeight(format: string | undefined) {
        if (markupValue === undefined) return;
        let markup = markupValue.markup.toWordplay();
        // Remove all weights from the current markup.
        for (const weight of Object.values(weights)) {
            markup = markup.replaceAll(weight, '');
        }
        // Add the desired weight.
        const delimiter = format ? weights[format] ?? '' : '';
        markup = delimiter + markup + delimiter;

        // Update the program
        Projects.revise(
            project,
            project.getBindReplacements(
                outputs.getExpressions(),
                outputs.property.getName(),
                new FormattedLiteral([
                    parseFormattedTranslation(
                        toTokens(FORMATTED_SYMBOL + markup + FORMATTED_SYMBOL),
                    ),
                ]),
            ),
        );
    }

    function setFormatted(formatted: boolean) {
        // If we want it formatted, and it's already formatted, do nothing.
        const currentExpression = outputs.getExpression();

        let newExpression: Expression | undefined = undefined;

        // Do we want it formatted?
        if (formatted) {
            // If the current expression has mixed values or is already formatted, do nothing
            if (
                currentExpression === undefined ||
                currentExpression instanceof FormattedLiteral
            )
                newExpression = undefined;
            // If the current expression is just a text literal, then convert it each translation into a formatted translation and make a new FormattedLiteral.
            else if (currentExpression instanceof TextLiteral)
                newExpression = new FormattedLiteral(
                    currentExpression.texts.map((text) =>
                        parseFormattedTranslation(
                            toTokens(
                                FORMATTED_SYMBOL +
                                    text.segments
                                        .map((seg) => seg.toWordplay())
                                        .join('') +
                                    FORMATTED_SYMBOL +
                                    text.language?.toWordplay(),
                            ),
                        ),
                    ),
                );
            // Otherwise, wrap the current expression, which presuambly generates text, in an example in a FormattedLiteral.
            else
                newExpression = new FormattedLiteral([
                    parseFormattedTranslation(
                        toTokens(
                            FORMATTED_SYMBOL +
                                CODE_SYMBOL +
                                currentExpression.toWordplay() +
                                CODE_SYMBOL +
                                FORMATTED_SYMBOL,
                        ),
                    ),
                ]);
        }
        // If we want it plain...
        else {
            // If its currently formatted, extract all of the words tokens and convert them to text translations.
            if (currentExpression instanceof FormattedLiteral)
                newExpression = new TextLiteral(
                    currentExpression.texts.map(
                        (formatted) =>
                            new Translation(
                                new Token(
                                    getLanguageQuoteClose(
                                        $locales.getLocale().language,
                                    ),
                                    Sym.Text,
                                ),
                                formatted
                                    .nodes()
                                    .filter(
                                        (node): node is Token | Example =>
                                            (node instanceof Token &&
                                                node.isSymbol(Sym.Words)) ||
                                            node instanceof Example,
                                    ),
                                new Token(
                                    getLanguageQuoteClose(
                                        $locales.getLocale().language,
                                    ),
                                    Sym.Text,
                                ),
                                formatted.language,
                            ),
                    ),
                );
            // If the current expressions are mixed values or are already a text literal or generated by an expression, do nothing
            else newExpression = undefined;
        }

        // Didn't create a new expression? Bail.
        if (newExpression === undefined) return;

        Projects.revise(
            project,
            project.getBindReplacements(
                outputs.getExpressions(),
                outputs.property.getName(),
                newExpression,
            ),
        );
    }
</script>

<NamedControl>
    <svelte:fragment slot="name"
        >{#if concept}
            <small
                ><ConceptLinkUI
                    link={concept}
                    label={DOCUMENTATION_SYMBOL}
                /></small
            >
        {/if}
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label id="formatted"
            >{$locales.get((l) => l.ui.palette.labels.format)}</label
        >
    </svelte:fragment>
    <svelte:fragment slot="control">
        <Checkbox
            label={$locales.get((l) => l.ui.palette.labels.format)}
            on={formatted}
            changed={(on) => setFormatted(on ?? false)}
            id="formatted"
        ></Checkbox>
    </svelte:fragment>
</NamedControl>
{#if formatted}
    <div class="aspects">
        <div class="aspect">
            <label for="font-weight"
                >{$locales.get((l) => l.ui.palette.labels.weight)}</label
            >
            <Options
                value={weight}
                label="Font weight"
                id="weight-chooser"
                width="auto"
                options={[
                    {
                        value: 'normal',
                        label: $locales.get((l) => l.ui.palette.labels.normal),
                    },
                    {
                        value: 'light',
                        label: $locales.get((l) => l.ui.palette.labels.light),
                    },
                    {
                        value: 'bold',
                        label: $locales.get((l) => l.ui.palette.labels.bold),
                    },
                    {
                        value: 'extra',
                        label: $locales.get((l) => l.ui.palette.labels.extra),
                    },
                ]}
                change={(value) => applyWeight(value)}
            ></Options>
        </div>
        <div class="aspect">
            <label for="font-italic"
                >{$locales.get((l) => l.ui.palette.labels.italic)}</label
            >
            <Checkbox
                label={$locales.get((l) => l.ui.palette.labels.italic)}
                on={italic}
                changed={() => applyStyle('italic')}
                id={'font-italic'}
            ></Checkbox>
        </div>
        <div class="aspect">
            <label for="text-underlined"
                >{$locales.get((l) => l.ui.palette.labels.underline)}</label
            >
            <Checkbox
                label={$locales.get((l) => l.ui.palette.labels.underline)}
                on={underlined}
                changed={() => applyStyle('underline')}
                id={'text-underlined'}
            ></Checkbox>
        </div>
    </div>
{/if}

<style>
    .aspects {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .aspect {
        display: flex;
        flex-direction: wrap;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
    }
</style>
