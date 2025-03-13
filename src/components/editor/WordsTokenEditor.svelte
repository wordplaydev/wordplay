<script lang="ts">
    import type Project from '@db/projects/Project';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Sym from '@nodes/Sym';
    import Token from '@nodes/Token';
    import { WordsRegEx } from '@parser/Tokenizer';
    import TokenEditor from './TokenEditor.svelte';

    interface Props {
        words: Token;
        project: Project;
        text: string;
        description: LocaleTextAccessor;
        placeholder: string | LocaleTextAccessor;
    }

    let { words, project, text, description, placeholder }: Props = $props();
</script>

<TokenEditor
    token={words}
    {project}
    {text}
    {description}
    {placeholder}
    validator={(newWords) =>
        newWords.length === 0 || !WordsRegEx.test(newWords)
            ? (l) => l.ui.source.error.invalidWords
            : true}
    creator={(text) => (text === '' ? undefined : new Token(text, Sym.Words))}
/>
