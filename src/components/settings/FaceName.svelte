<script lang="ts">
    import Fonts, { type Face } from '@basis/Fonts';
    import { Scripts } from '@locale/Scripts';
    import { onMount } from 'svelte';

    interface Props {
        name: string;
        face: Face;
    }

    let { name, face }: Props = $props();

    let element: HTMLDivElement | undefined = $state();

    // When this option becomes visible (e.g. the user opens the chooser and
    // scrolls past it), kick off a lightweight single-file load so the name
    // renders in its own face. Faces the user never scrolls to don't load.
    onMount(() => {
        if (element === undefined || typeof IntersectionObserver === 'undefined')
            return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                Fonts.loadFaceForPreview(name);
                observer.disconnect();
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    });
</script>

<div bind:this={element} class="face">
    <span style="font-family: {name}; white-space: nowrap;">{name}</span>
    <sub>
        • {#each face.scripts as script, index}
            {#if index > 0},{/if}
            {Scripts[script]?.name ?? '?'}
        {/each}
    </sub>
</div>

<style>
    .face {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }
</style>
