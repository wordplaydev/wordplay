<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import type Tile from './Tile';
    import { locales } from '@db/Database';
    import type Project from '../../models/Project';

    export let project: Project;
    export let tile: Tile;

    const dispatch = createEventDispatcher();
</script>

<Toggle
    uiid="{tile.id}Expand"
    tips={$locales.get((l) => l.ui.tile.toggle.show)}
    on={tile.isExpanded()}
    toggle={() => dispatch('toggle')}>{tile.getName(project, $locales)}</Toggle
>
