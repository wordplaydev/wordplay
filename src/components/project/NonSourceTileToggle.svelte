<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import type Tile from './Tile';
    import { locales } from '@db/Database';

    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Toggle
    uiid="{tile.id}Expand"
    tips={$locales.get((l) => l.ui.tile.toggle.show)}
    on={tile.isExpanded()}
    toggle={() => dispatch('toggle')}>{tile.name}</Toggle
>
