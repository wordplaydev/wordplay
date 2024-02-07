<script lang="ts">
    export let center = false;
</script>

<div class="note" class:center><slot /></div>

<style>
    div {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-header);
    }

    .center {
        text-align: center;
    }
</style>
