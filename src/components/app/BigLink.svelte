<script lang="ts">
    export let to: string;
</script>

<p><a href={to}><slot /></a></p>

<style>
    p {
        font-size: 200%;
        margin-bottom: var(--wordplay-spacing);
    }
</style>
