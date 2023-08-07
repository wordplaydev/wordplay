<svelte:options immutable={true} />

<script lang="ts">
    import type TextValue from '@values/TextValue';
    import UnicodeString from '../../models/UnicodeString';
    import Expandable from './Expandable.svelte';

    export let value: TextValue;
    export let inline: boolean = true;

    $: text = value.toWordplay();

    const limit = 32;
</script>

{#if inline && text.length > limit}
    <Expandable
        ><svelte:fragment slot="expanded">{text}</svelte:fragment
        ><svelte:fragment slot="collapsed"
            >{new UnicodeString(text)
                .substring(0, limit)
                .toString()}…</svelte:fragment
        ></Expandable
    >{:else}{text}{/if}
