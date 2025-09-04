<script lang="ts">
    import type Project from '@db/projects/Project';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Sym from '@nodes/Sym';
    import Token from '@nodes/Token';
    import { toTokens } from '@parser/toTokens';
    import TokenTextEditor from './TokenEditor.svelte';

    interface Props {
        number: Token;
        project: Project;
        text: string;
        description: LocaleTextAccessor;
        placeholder: LocaleTextAccessor | string;
    }

    let { number, project, text, description, placeholder }: Props = $props();
</script>

<TokenTextEditor
    token={number}
    {project}
    {text}
    {description}
    {placeholder}
    validator={(newNumber) => {
        const tokens = toTokens(newNumber);
        return tokens.remaining() === 2 && tokens.nextIs(Sym.Number)
            ? true
            : (l) => l.ui.palette.error.nan;
    }}
    creator={(text) => new Token(text, Sym.Number)}
/>
