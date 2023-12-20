<script lang="ts">
    export let center = false;
</script>

<div class="note" class:center><slot /></div>

<style>
    div {
        font-style: italic;
        font-size: calc(var(--wordplay-font-size) - 2pt);
        color: var(--wordplay-inactive-color);
    }

    .center {
        text-align: center;
    }
</style>
