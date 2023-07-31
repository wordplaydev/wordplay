<script lang="ts">
    export let to: string;
    export let external: boolean = false;
</script>

<a href={to} target={external ? '_blank' : null}><slot /></a>

<style>
    a {
        color: var(--wordplay-highlight-color);
        text-decoration: none;
    }

    a:focus {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
    }
</style>
