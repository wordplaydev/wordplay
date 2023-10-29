<script>
    import Tilted from './Tilted.svelte';
</script>

<h2><Tilted><slot /></Tilted></h2>

<style>
    h2 {
        font-size: min(6vw, 20pt);
    }
</style>
