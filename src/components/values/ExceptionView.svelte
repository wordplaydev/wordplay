<svelte:options immutable={true} />

<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { locale } from '../../db/Database';

    export let value: ExceptionValue;
    export let inline = true;
</script>

{#if inline || !inline}
    ! {value.getDescription($locale).toText()}
{/if}
