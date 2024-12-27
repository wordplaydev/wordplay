<script lang="ts">
    import { page } from '$app/state';

    interface Props {
        to: string;
        tip?: string | undefined;
        nowrap?: boolean;
        external?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        tip = undefined,
        nowrap = false,
        external = false,
        children,
    }: Props = $props();
</script>

{#if to === '/' ? page.route.id === '/' : page.route.id?.endsWith(to)}
    {@render children?.()}
{:else}<a
        data-sveltekit-preload-data="tap"
        title={tip}
        href={to}
        target={external ? '_blank' : null}
        class:nowrap
        >{@render children?.()}{#if external}<span class="external">↗</span
            >{/if}</a
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
