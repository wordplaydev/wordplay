<svelte:options immutable={true} />

<script lang="ts">
    import type ExceptionValue from '@values/ExceptionValue';
    import { config } from '../../db/Creator';

    export let value: ExceptionValue;
</script>

! {value.getDescription($config.getLocale()).toText()}
