<svelte:options immutable={true} />

<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { locales } from '../../db/Database';

    export let value: ExceptionValue;
    export let inline = true;
</script>

{#if inline || !inline}
    ! {value.getDescription($locales).toText()}
{/if}
