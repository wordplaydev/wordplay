<script lang="ts">
    import Sym from '@nodes/Sym';
    import type Project from '@models/Project';
    import Token from '@nodes/Token';
    import { toTokens } from '@parser/toTokens';
    import TokenTextEditor from './TokenEditor.svelte';

    export let number: Token;
    export let project: Project;
    export let text: string;
    export let placeholder: string;
</script>

<TokenTextEditor
    token={number}
    {project}
    {text}
    {placeholder}
    validator={(newNumber) => {
        const tokens = toTokens(newNumber);
        return tokens.remaining() === 2 && tokens.nextIs(Sym.Number);
    }}
    creator={(text) => new Token(text, Sym.Number)}
/>
