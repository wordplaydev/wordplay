<script lang="ts">
    export let to: string;
    export let external = false;
</script>

<a href={to} target={external ? '_blank' : null}><slot /></a>

<style>
    a {
        color: var(--wordplay-highlight-color);
        text-decoration: none;
    }

    a:focus,
    a:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }
</style>
