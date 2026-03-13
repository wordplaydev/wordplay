<!-- Is a wrapper around FormattedEditor where the translated text, wrapped in ¶...¶s, is a state managed in this component -->

<script lang="ts">
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { SvelteMap, SvelteSet } from 'svelte/reactivity';

    interface Props {
        markupText: string | undefined;
        currentLocale: string;
        usedLocales: SvelteSet<string>;
        id: number;
    }

    let {
        markupText = $bindable(),
        currentLocale,
        usedLocales = $bindable(),
        id,
    }: Props = $props();

    let languageToTextMap: SvelteMap<string, string> = $state(new SvelteMap());

    $effect(() => {
        if (!markupText) markupText = '';
        languageToTextMap = HowTo.markupToMapHelper(markupText);
    });

    $effect(() => {
        if (currentLocale && !languageToTextMap.has(currentLocale)) {
            languageToTextMap.set(currentLocale, '');
        }
    });

    $effect(() => {
        markupText = languageToTextMap
            .entries()
            .reduce(
                (acc, [language, text]) =>
                    acc + (text.length === 0 ? '' : `¶${text}¶/${language}`),
                '',
            );
    });
</script>

<FormattedEditor
    placeholder={(l) => l.ui.howto.editor.editor.placeholder}
    description={(l) => l.ui.howto.editor.editor.description}
    bind:text={
        () => {
            return languageToTextMap.get(currentLocale) ?? '';
        },
        (v) => {
            languageToTextMap.set(currentLocale, v);
            usedLocales.add(currentLocale);
        }
    }
    id="howto-prompt-{id}"
/>
