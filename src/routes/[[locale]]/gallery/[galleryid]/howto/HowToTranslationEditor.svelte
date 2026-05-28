<!-- Wrapper around FormattedEditor that handles the multilingual ¶...¶/locale markup encoding.
     markupText (a bindable parent state) is the single source of truth; we parse on read and
     re-encode on write, rather than caching a parallel map in local state (which previously
     created a bidirectional effect loop that could clobber in-flight edits). -->

<script lang="ts">
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { SvelteSet } from 'svelte/reactivity';

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

    function stringifyMap(map: Map<string, string>): string {
        let result = '';
        for (const [language, text] of map) {
            if (text.length > 0) result += `¶${text}¶/${language}`;
        }
        return result;
    }

    function readCurrent(): string {
        if (!markupText) return '';
        return HowTo.markupToMapHelper(markupText).get(currentLocale) ?? '';
    }

    function writeCurrent(v: string) {
        const map = HowTo.markupToMapHelper(markupText ?? '');
        map.set(currentLocale, v);
        usedLocales.add(currentLocale);
        markupText = stringifyMap(map);
    }
</script>

<FormattedEditor
    placeholder={(l) => l.ui.howto.editor.editor.placeholder}
    description={(l) => l.ui.howto.editor.editor.description}
    bind:text={
        () => readCurrent(),
        (v) => writeCurrent(v)
    }
    id="howto-prompt-{id}"
/>
