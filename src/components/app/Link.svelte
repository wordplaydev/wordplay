<script lang="ts">
    import { page } from '$app/stores';

    export let to: string;
    export let tip: string | undefined = undefined;
    export let external = false;
</script>

{#if to === '/' ? $page.route.id === '/' : $page.route.id?.startsWith(to)}
    <slot />
{:else}<a title={tip} href={to} target={external ? '_blank' : null}><slot /></a>
{/if}

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
