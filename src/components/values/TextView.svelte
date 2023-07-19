<svelte:options immutable={true} />

<script lang="ts">
    import Symbol from '@nodes/Symbol';
    import type Text from '@runtime/Text';
    import UnicodeString from '../../models/UnicodeString';
    import Expandable from './Expandable.svelte';
    import SymbolView from './SymbolView.svelte';

    export let value: Text;
    $: text = value.toWordplay();

    const limit = 32;
</script>

{#if text.length > limit}
    <Expandable
        ><svelte:fragment slot="expanded"
            ><SymbolView symbol={text} type={Symbol.Text} /></svelte:fragment
        ><svelte:fragment slot="collapsed"
            ><SymbolView
                symbol={new UnicodeString(text).substring(0, limit).toString()}
                type={Symbol.Text}
            />…</svelte:fragment
        ></Expandable
    >{:else}<SymbolView symbol={text} type={Symbol.Text} />{/if}
