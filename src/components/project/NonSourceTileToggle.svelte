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
    action={() => dispatch('toggle')}>{tile.name}</Button
>
