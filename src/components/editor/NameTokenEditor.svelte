<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { Projects } from '@db/Database';
    import Sym from '@nodes/Sym';
    import { toTokens } from '@parser/toTokens';
    import type Project from '@models/Project';
    import { getCaret } from '@components/project/Contexts';
    import NameToken from '@nodes/NameToken';
    import type Token from '@nodes/Token';

    export let name: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;

    let caret = getCaret();
</script>

<TextField
    {text}
    id={name.id}
    classes={['token-editor']}
    placeholder={placeholder ?? ''}
    description={placeholder ?? ''}
    validator={(newName) => {
        const tokens = toTokens(newName);
        return (
            tokens.remaining() === 2 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder)
        );
    }}
    changed={(newName) => {
        if (newName !== name.getText()) {
            const newToken = new NameToken(newName);
            Projects.revise(project, [[name, newToken]]);
            if (caret && $caret)
                caret.set($caret.withPosition(name).withAddition(newToken));
        }
    }}
></TextField>
