<script lang="ts">
    import Sym from '@nodes/Sym';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { WordsRegEx } from '@parser/Tokenizer';
    import TokenTextEditor from './TokenEditor.svelte';

    export let words: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TokenTextEditor
    token={words}
    {project}
    {text}
    {placeholder}
    validator={(newWords) => newWords === '' || WordsRegEx.test(newWords)}
    creator={(text) => new Token(text, Sym.Words)}
/>
