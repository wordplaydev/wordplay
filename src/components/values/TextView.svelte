<script lang="ts">
    import type TextValue from '@values/TextValue';
    import UnicodeString from '../../models/UnicodeString';
    import Expandable from './Expandable.svelte';
    import Sym from '@nodes/Sym';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: TextValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let text = $derived(value.toWordplay());

    const limit = 32;
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
