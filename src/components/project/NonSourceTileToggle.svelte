<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { preferredTranslations } from '@translation/translations';
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';

    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Button
    tip={`${$preferredTranslations[0].ui.tooltip.expand} ${tile.name}`}
    action={() => dispatch('toggle')}
    ><span class="name" class:collapsed={tile.isCollapsed()}>{tile.name}</span
    ></Button
>

<style>
    .collapsed {
        display: inline-block;
        transform: scale(1.4);
    }
</style>
