<script lang="ts">
    import { Sym } from '@nodes/Sym';
    import type TextValue from '@values/TextValue';
    import UnicodeString from '@unicode/UnicodeString';
    import Expandable from '@components/values/Expandable.svelte';
    import SymbolView from '@components/values/SymbolView.svelte';

    interface Props {
        value: TextValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let text = $derived(value.toWordplay());
    let unicode = $derived(new UnicodeString(text));
    let length = $derived(unicode.getLength());

    const limit = 8;
</script>

{#if inline}
    <Expandable count={length} start={Math.min(limit, length)}
        >{#snippet content(shown)}<SymbolView
                symbol={unicode.substring(0, shown).toString()}
                type={Sym.Text}
            />{/snippet}</Expandable
    >
{:else}<SymbolView symbol={text} type={Sym.Text} />{/if}
