<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';
    import { config } from '../../db/Creator';

    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Button
    classes={tile.id}
    uiid="{tile.id}Expand"
    tip={`${$config.getLocale().ui.description.expand} ${tile.name}`}
    action={() => dispatch('toggle')}
    ><span class="name" class:collapsed={tile.isCollapsed()}>{tile.name}</span
    ></Button
>

<style>
    :not(.collapsed) {
        display: inline-block;
        transform: scale(0.85);
    }
</style>
