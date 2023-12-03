<script lang="ts">
    import { page } from '$app/stores';

    export let to: string;
    export let tip: string | undefined = undefined;
    export let nowrap = false;
    export let external = false;
</script>

{#if to === '/' ? $page.route.id === '/' : $page.route.id?.startsWith(to)}
    <slot />
{:else}<a
        data-sveltekit-preload-data="tap"
        title={tip}
        href={to}
        target={external ? '_blank' : null}
        class:nowrap
        ><slot />{#if external}<span class="external">↗</span>{/if}</a
    >
{/if}

<style>
    a {
        color: var(--wordplay-highlight-color);
        text-decoration: none;
    }

    .nowrap {
        white-space: nowrap;
    }

    a:focus,
    a:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    .external {
        font-size: calc(var(--wordplay-font-size) - 6pt);
        display: inline-block;
        margin-inline-start: 0.25em;
    }
</style>
