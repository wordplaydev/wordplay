<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { preferredLocales } from '@locale/locales';
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';

    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Button
    tip={`${$preferredLocales[0].ui.tooltip.expand} ${tile.name}`}
    action={() => dispatch('toggle')}
    ><span class="name" class:collapsed={tile.isCollapsed()}>{tile.name}</span
    ></Button
>
