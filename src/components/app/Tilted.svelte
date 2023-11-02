<script lang="ts">
    export let capitalized = true;
</script>

<span class:capitalized><slot /></span>

<style>
    span {
        display: inline-block;
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-header);
        margin-block-end: 0;
        font-weight: bold;
        text-align: start;
        transform: rotate(-1deg);
    }

    .capitalized {
        text-transform: capitalize;
    }
</style>
