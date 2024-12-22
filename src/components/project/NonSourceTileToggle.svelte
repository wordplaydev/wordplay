<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import type Tile from './Tile';
    import { locales } from '@db/Database';
    import type Project from '../../models/Project';
    import Emoji from '@components/app/Emoji.svelte';
    import TileSymbols from './TileSymbols';
    import { TYPE_SYMBOL } from '@parser/Symbols';

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
    ><Emoji>{TileSymbols[tile.kind]}</Emoji>
    {tile.getName(project, $locales)}</Toggle
>
