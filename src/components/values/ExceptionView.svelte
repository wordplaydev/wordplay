<svelte:options immutable={true} />

<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { config } from '../../db/Creator';

    export let value: ExceptionValue;
    export const inline: boolean = true;
</script>

! {value.getDescription($config.getLocale()).toText()}
