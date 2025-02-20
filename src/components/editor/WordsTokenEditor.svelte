<script lang="ts">
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Sym from '@nodes/Sym';
    import Token from '@nodes/Token';
    import { WordsRegEx } from '@parser/Tokenizer';
    import TokenTextEditor from './TokenEditor.svelte';

    interface Props {
        words: Token;
        project: Project;
        text: string;
        placeholder: string;
    }

    let { words, project, text, placeholder }: Props = $props();
</script>

<TokenTextEditor
    token={words}
    {project}
    {text}
    {placeholder}
    validator={(newWords) =>
        newWords.length === 0 || !WordsRegEx.test(newWords)
            ? $locales.get((l) => l.ui.source.error.invalidWords)
            : true}
    creator={(text) => (text === '' ? undefined : new Token(text, Sym.Words))}
/>
