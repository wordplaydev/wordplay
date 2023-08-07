<svelte:options immutable={true} />

<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { config } from '../../db/Database';

    export let value: ExceptionValue;
    export let inline: boolean = true;
</script>

{#if inline || !inline}
    ! {value.getDescription($config.getLocale()).toText()}
{/if}
