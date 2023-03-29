<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import type Text from '@runtime/Text';
    import UnicodeString from '../../models/UnicodeString';
    import Expandable from './Expandable.svelte';
    import SymbolView from './SymbolView.svelte';

    export let value: Text;
    $: text = value.toWordplay();
</script>

<Expandable
    ><svelte:fragment slot="expanded"
        ><SymbolView symbol={text} type={TokenType.Text} /></svelte:fragment
    ><svelte:fragment slot="collapsed"
        ><SymbolView
            symbol={new UnicodeString(text).substring(0, 10).toString()}
            type={TokenType.Text}
        />{#if text.length > 10}…{/if}</svelte:fragment
    ></Expandable
>
