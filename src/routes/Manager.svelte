<script>
    import Header from './Header.svelte';
</script>

<div class="manager">
    <Header></Header>
    <div class="windows">Everything else</div>
</div>

<style>
    .manager {
        width: 100vw;
        height: 100vw;
        padding: 0;
        display: flex;
        flex-direction: column;
    }

    .windows {
        height: auto;
        padding: var(--wordplay-spacing);
    }

</style>