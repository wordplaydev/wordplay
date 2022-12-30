<svelte:options immutable={true} />

<script lang="ts">
</script>

<span><slot /></span>

<style>
    span {
        display: inline-block;
        border-bottom: 2px solid var(--wordplay-error);
    }
</style>
