<script lang="ts">
    export let to: string;
</script>

<p><a href={to}><slot /></a></p>

<style>
    p {
        font-size: 8vw;
        margin-bottom: var(--wordplay-spacing);
    }
</style>
