<script lang="ts">
    import Sym from '@nodes/Sym';
    import type TextValue from '@values/TextValue';
    import UnicodeString from '../../unicode/UnicodeString';
    import Expandable from './Expandable.svelte';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: TextValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let text = $derived(value.toWordplay());

    const limit = 8;
</script>

{#if inline && text.length > limit}
    <Expandable
        >{#snippet expanded()}
            <SymbolView symbol={text} type={Sym.Text} />
        {/snippet}
        {#snippet collapsed()}
            <SymbolView
                symbol="{new UnicodeString(text)
                    .substring(0, limit)
                    .toString()}…"
                type={Sym.Text}
            />
        {/snippet}</Expandable
    >{:else}<SymbolView symbol={text} type={Sym.Text} />{/if}
