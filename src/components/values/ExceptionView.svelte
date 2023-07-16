<svelte:options immutable={true} />

<script lang="ts">
    import type Exception from '../../runtime/Exception';
    import { creator } from '../../db/Creator';

    export let value: Exception;
</script>

! {value.getDescription($creator.getLocale()).toText()}
