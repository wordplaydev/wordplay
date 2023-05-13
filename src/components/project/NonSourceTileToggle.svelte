<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';
    import { creator } from '../../db/Creator';

    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Button
    tip={`${$creator.getLocale().ui.tooltip.expand} ${tile.name}`}
    action={() => dispatch('toggle')}
    ><span class="name" class:collapsed={tile.isCollapsed()}>{tile.name}</span
    ></Button
>
