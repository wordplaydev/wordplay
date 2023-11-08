<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import type Tile from './Tile';
    import { locales } from '@db/Database';
    import type Project from '../../models/Project';
    import Emoji from '@components/app/Emoji.svelte';
    import TileSymbols from './TileSymbols';

    export let project: Project;
    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Toggle
    uiid="{tile.id}Expand"
    tips={$locales.get((l) => l.ui.tile.toggle.show)}
    on={tile.isExpanded()}
    toggle={() => dispatch('toggle')}
    ><Emoji>{TileSymbols[tile.kind]}</Emoji>
    {tile.getName(project, $locales)}</Toggle
>
