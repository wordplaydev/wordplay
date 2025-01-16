<script lang="ts">
    import Sym from '@nodes/Sym';
    import type Project from '@db/projects/Project';
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
    validator={(newWords) => newWords === '' || WordsRegEx.test(newWords)}
    creator={(text) => (text === '' ? undefined : new Token(text, Sym.Words))}
/>
