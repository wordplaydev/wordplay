<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import Sym from '@nodes/Sym';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { WordsRegEx } from '@parser/Tokenizer';

    export let words: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TextField
    {text}
    id={words.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    validator={(newWords) => WordsRegEx.test(newWords)}
    changed={(newName) =>
        newName !== words.getText()
            ? Projects.revise(project, [[words, new Token(newName, Sym.Words)]])
            : undefined}
></TextField>
