<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import Sym from '@nodes/Sym';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { toTokens } from '@parser/toTokens';

    export let number: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TextField
    {text}
    id={number.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    validator={(newNumber) => {
        const tokens = toTokens(newNumber);
        return tokens.remaining() === 2 && tokens.nextIs(Sym.Number);
    }}
    changed={(newNumber) =>
        newNumber !== number.getText()
            ? Projects.revise(project, [
                  [number, new Token(newNumber, Sym.Number)],
              ])
            : undefined}
></TextField>
