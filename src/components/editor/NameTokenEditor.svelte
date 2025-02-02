<script lang="ts">
    import Sym from '@nodes/Sym';
    import { toTokens } from '@parser/toTokens';
    import type Project from '@db/projects/Project';
    import NameToken from '@nodes/NameToken';
    import type Token from '@nodes/Token';
    import TokenTextEditor from './TokenEditor.svelte';
    import { getCaret } from '@components/project/Contexts';
    import Name from '@nodes/Name';

    interface Props {
        name: Token;
        project: Project;
        text: string;
        placeholder: string;
    }

    let { name, project, text, placeholder }: Props = $props();

    const caret = getCaret();
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
    creator={(text) => {
        if (caret && $caret) {
            const parent = project.getRoot(name)?.getParent(name);
            if (parent instanceof Name) {
                const edit = $caret.rename(parent, text, project, 0);
                if (edit) return [edit[2].name, edit[0]];
            }
        }

        return new NameToken(text);
    }}
/>
