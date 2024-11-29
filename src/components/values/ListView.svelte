<script lang="ts">
    import type ListValue from '@values/ListValue';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import SymbolView from './SymbolView.svelte';
    import ValueView from './ValueView.svelte';
    import Sym from '@nodes/Sym';
    import Expandable from './Expandable.svelte';

    interface Props {
        value: ListValue;
        /** If inline, uses a collapse threadshold. Block uses a higher one. */
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    const CollapseLimit = 3;
    const MaxItems = 100;
</script>

<SymbolView
    symbol={LIST_OPEN_SYMBOL}
    type={Sym.ListOpen}
/>{#if value.values.length > CollapseLimit}<Expandable
        >{#snippet expanded()}
            {#each value.values as item, index}<ValueView
                    value={item}
                    {inline}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}
        {/snippet}
        {#snippet collapsed()}
            {#each value.values.slice(0, inline ? CollapseLimit : MaxItems) as item, index}<ValueView
                    value={item}
                    {inline}
                />{#if index < value.values.length - 1}{' '}{/if}{/each}…
        {/snippet}</Expandable
    >{:else}{#each value.values as item, index}<ValueView
            value={item}
            {inline}
        />{#if index < value.values.length - 1}{' '}{/if}{/each}{/if}<SymbolView
    symbol={LIST_CLOSE_SYMBOL}
    type={Sym.ListClose}
/>
