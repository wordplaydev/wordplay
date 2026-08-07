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
<!-- Name the tile in the tooltip: the toggles sit side by side, and a bare "show" is
     indistinguishable between them, especially to a screen reader. The name is resolved
     per locale, since a tile's name is itself locale text. -->
<Toggle
    uiid="{tile.id}Expand"
    testid="{tile.id}-toggle"
    tips={(l) => l.ui.tile.toggle.show}
    tipInputs={(locale) => ({ name: tile.getName(project, locale) })}
    on={tile.isExpanded() && !tile.isInvisible()}
    toggle={() => toggle()}
    highlight={notification}
    ><Emoji text={TileKinds[tile.kind].symbol} />
    <span class="toggle-label">{tile.getName(project, $locales)}</span></Toggle
>
