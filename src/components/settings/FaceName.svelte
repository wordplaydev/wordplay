<script lang="ts">
    import type { Face } from '@basis/Fonts';
    import { Scripts } from '@locale/Scripts';

    interface Props {
        name: string;
        face: Face;
    }

    let { name, face }: Props = $props();
</script>

<div class="face">
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
