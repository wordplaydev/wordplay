<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Tile from '@components/project/Tile';
    import TileKinds from '@components/project/TileKinds';

    interface Props {
        project: Project;
        tile: Tile;
        notification?: boolean;
        toggle: () => void;
    }

    let { project, tile, notification = false, toggle }: Props = $props();
</script>

<!-- The source is expanded if it's actually expanded and not empty size -->
<Toggle
    uiid="{tile.id}Expand"
    testid="{tile.id}-toggle"
    tips={(l) => l.ui.tile.toggle.show}
    on={tile.isExpanded() && !tile.isInvisible()}
    toggle={() => toggle()}
    highlight={notification}
    ><Emoji>{TileKinds[tile.kind].symbol}</Emoji>
    {tile.getName(project, $locales)}</Toggle
>
