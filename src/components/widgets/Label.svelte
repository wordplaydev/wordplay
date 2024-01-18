<script lang="ts">
    export let center = false;
</script>

<div class="label" class:center><slot /></div>

<style>
    div {
        background-color: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: calc(var(--wordplay-spacing) / 2);
    }

    .center {
        text-align: center;
    }
</style>
