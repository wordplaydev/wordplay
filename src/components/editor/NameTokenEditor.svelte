<script lang="ts">
    import Sym from '@nodes/Sym';
    import { toTokens } from '@parser/toTokens';
    import type Project from '@models/Project';
    import NameToken from '@nodes/NameToken';
    import type Token from '@nodes/Token';
    import TokenTextEditor from './TokenTextEditor.svelte';

    export let name: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TokenTextEditor
    token={name}
    {project}
    {text}
    {placeholder}
    validator={(newName) => {
        const tokens = toTokens(newName);
        return (
            tokens.remaining() === 2 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder)
        );
    }}
    creator={(text) => new NameToken(text)}
/>
