<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '../../runtime/Exception';
    import { config } from '../../db/Creator';

    export let value: Exception;
</script>

! {value.getDescription($config.getLocale()).toText()}
