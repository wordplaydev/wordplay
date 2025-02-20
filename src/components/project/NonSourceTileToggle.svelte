<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import { locales } from '@db/Database';
    import { createEventDispatcher } from 'svelte';
    import type Project from '../../db/projects/Project';
    import Toggle from '../widgets/Toggle.svelte';
    import type Tile from './Tile';
    import TileKinds from './TileKinds';

    interface Props {
        project: Project;
        tile: Tile;
        notification?: boolean;
    }

    let { project, tile, notification = false }: Props = $props();

    const dispatch = createEventDispatcher();
</script>

<Toggle
    uiid="{tile.id}Expand"
    testid="{tile.id}-toggle"
    tips={$locales.get((l) => l.ui.tile.toggle.show)}
    on={tile.isExpanded()}
    toggle={() => dispatch('toggle')}
    highlight={notification}
    ><Emoji>{TileKinds[tile.kind].symbol}</Emoji>
    {#if tile.isCollapsed()}{tile.getName(project, $locales)}{/if}</Toggle
>
