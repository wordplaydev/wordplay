<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import Sym from '@nodes/Sym';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { WordsRegEx } from '@parser/Tokenizer';
    import { getCaret } from '@components/project/Contexts';

    export let words: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;

    const caret = getCaret();
</script>

<TextField
    {text}
    id={words.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    validator={(newWords) => WordsRegEx.test(newWords)}
    changed={(newName) => {
        if (newName !== words.getText()) {
            const token = new Token(newName, Sym.Words);
            Projects.revise(project, [[words, token]]);
            if (caret && $caret)
                caret.set($caret.withPosition(token).withAddition(token));
        }
    }}
></TextField>
