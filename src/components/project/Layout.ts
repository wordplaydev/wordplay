import Arrangement from '../../db/settings/Arrangement';
import type Bounds from './Bounds';
import Tile, { TileKind, TileMode } from './Tile';
import TileKinds from './TileKinds';

export const LAYOUT_ICON_RESPONSIVE = '📐';
export const LAYOUT_ICON_HORIZONTAL = '↔️';
export const LAYOUT_ICON_VERTICAL = '↕';
export const LAYOUT_ICON_SPLIT = '⏹️⏹️';
export const LAYOUT_ICON_SINGLE = '⏹️';
export const LAYOUT_ICON_FREE = '✣';

export const LayoutIcons = {
    [Arrangement.Responsive]: LAYOUT_ICON_RESPONSIVE,
    [Arrangement.Horizontal]: LAYOUT_ICON_HORIZONTAL,
    [Arrangement.Vertical]: LAYOUT_ICON_VERTICAL,
    [Arrangement.Split]: LAYOUT_ICON_SPLIT,
    [Arrangement.Single]: LAYOUT_ICON_SINGLE,
    [Arrangement.Free]: LAYOUT_ICON_FREE,
};

export type Position = {
    /** A set of tile kinds or a source numbers that this is laying out. */
    id: TileKind[];
    /** The proportional position at which the tile should be positioned if expanded, between 0 and 1. Could be placed earlier if groups previous are not visible */
    position: number;
    /** Whether to share the space of tiles of the same kind on this axis. Undefined means false */
    split?: boolean;
};

export type Axis = {
    /** The axis this corresponds to */
    direction: 'x' | 'y';
    /** The splits to apply; should be monotonically increasing in position. */
    positions: Position[];
};

/** The current layouts for each arrangement that supports splits. If null, there is no proportions, so we have defaults. */
export type Splits = {
    horizontal: Axis[] | null;
    vertical: Axis[] | null;
};

export type SerializedTile = {
    id: TileKind | string;
    expanded: boolean;
    bounds: Bounds | null;
    position: Bounds;
    kind: TileKind;
};

export type SerializedLayout = {
    fullscreen: string | null;
    tiles: SerializedTile[];
    /** Optional persistent splits defining the splits between tiles in vetical and horizontal layouts */
    splits?: Splits | null;
};

const DefaultHorizontalSplits: Axis[] = [
    {
        direction: 'y',
        positions: [
            { id: [TileKind.Documentation], position: 0.0 },
            { id: [TileKind.Collaborate], position: 0.5 },
        ],
    },
    {
        direction: 'x',
        positions: [
            {
                id: [TileKind.Documentation, TileKind.Collaborate],
                position: 0,
            },
            { id: [TileKind.Source], position: 0.25, split: true },
            {
                id: [TileKind.Output, TileKind.Palette],
                position: 0.7,
            },
        ],
    },
    {
        direction: 'y',
        positions: [
            {
                id: [TileKind.Source],
                position: 0.0,
            },
        ],
    },
    {
        direction: 'y',
        positions: [
            { id: [TileKind.Output], position: 0.0 },
            { id: [TileKind.Palette], position: 0.5 },
        ],
    },
];

const DefaultVerticalSplits: Axis[] = [
    {
        direction: 'x',
        positions: [
            { id: [TileKind.Documentation], position: 0.0 },
            { id: [TileKind.Collaborate], position: 0.5 },
        ],
    },
    {
        direction: 'x',
        positions: [
            {
                id: [TileKind.Source],
                position: 0.0,
            },
        ],
    },
    {
        direction: 'y',
        positions: [
            {
                id: [TileKind.Output, TileKind.Palette],
                position: 0,
            },
            { id: [TileKind.Source], position: 0.3, split: true },
            {
                id: [TileKind.Documentation, TileKind.Collaborate],
                position: 0.7,
            },
        ],
    },
    {
        direction: 'x',
        positions: [
            { id: [TileKind.Output], position: 0.0 },
            { id: [TileKind.Palette], position: 0.5 },
        ],
    },
];

export default class Layout {
    readonly projectID: string;
    readonly tiles: Tile[];
    readonly fullscreenID: string | undefined;
    readonly splits: Splits | null;

    constructor(
        projectID: string,
        tiles: Tile[],
        fullscreenID: string | undefined,
        splits: Splits | null,
    ) {
        this.projectID = projectID;
        this.fullscreenID = fullscreenID;
        this.tiles = tiles;
        this.splits = splits ?? null;
    }

    toObject(): SerializedLayout {
        return {
            fullscreen: this.fullscreenID ?? null,
            tiles: this.tiles.map((tile) => {
                return {
                    id: tile.id,
                    kind: tile.kind,
                    bounds: tile.bounds ?? null,
                    expanded: tile.mode === TileMode.Expanded,
                    position: tile.position,
                };
            }),
            splits: this.splits,
        };
    }

    static fromObject(projectID: string, layout: SerializedLayout | null) {
        return layout === null
            ? null
            : new Layout(
                  projectID,
                  layout.tiles.map(
                      (tile) =>
                          new Tile(
                              tile.id,
                              tile.kind,
                              tile.expanded
                                  ? TileMode.Expanded
                                  : TileMode.Collapsed,
                              tile.bounds
                                  ? {
                                        ...tile.bounds,
                                        left: Math.max(0, tile.bounds.left),
                                        top: Math.max(0, tile.bounds.top),
                                    }
                                  : undefined,
                              tile.position ?? undefined,
                          ),
                  ),
                  layout.fullscreen ?? undefined,
                  layout.splits ?? null,
              );
    }

    // Given the current arrangement, get a list of axes for layout, including default proportions if not defined.
    getSplits(arrangement: Arrangement, width: number, height: number) {
        return arrangement === Arrangement.Horizontal
            ? (this.splits?.horizontal ?? DefaultHorizontalSplits)
            : arrangement === Arrangement.Vertical
              ? (this.splits?.vertical ?? DefaultVerticalSplits)
              : arrangement === Arrangement.Responsive
                ? width > height
                    ? (this.splits?.horizontal ?? DefaultHorizontalSplits)
                    : (this.splits?.vertical ?? DefaultVerticalSplits)
                : null;
    }

    isFullscreen() {
        return this.fullscreenID !== undefined;
    }

    isStageFullscreen() {
        return this.fullscreenID === TileKind.Output;
    }

    isFullscreenNonSource() {
        return (
            this.fullscreenID !== undefined &&
            this.getTileWithID(this.fullscreenID)?.kind !== TileKind.Source
        );
    }

    isSourceExpanded() {
        return this.tiles.some((tile) => tile.isSource() && tile.isExpanded());
    }

    getTilesInReadingOrder() {
        return this.tiles.toSorted((a, b) => a.getOrder() - b.getOrder());
    }

    getTileWithID(id: string) {
        return this.tiles.find((tile) => tile.id === id);
    }

    static getSourceID(index: number) {
        return `source${index}`;
    }

    getSource(index: number) {
        return this.getTileWithID(Layout.getSourceID(index));
    }

    getPalette() {
        return this.getTileWithID(TileKind.Palette);
    }

    getOutput() {
        return this.getTileWithID(TileKind.Output);
    }

    getDocs() {
        return this.getTileWithID(TileKind.Documentation);
    }

    hasVisibleCollapsedSource() {
        return this.getSources().some((tile) => !tile.isCollapsed());
    }

    getSources() {
        return this.tiles.filter((tile) => tile.id.startsWith('source'));
    }

    getVisibleSourceCount() {
        return this.getSources().filter((s) => s.isExpanded()).length;
    }

    getNonSources() {
        return this.tiles
            .filter((tile) => !tile.id.startsWith('source'))
            .sort(
                (a, b) =>
                    TileKinds[a.id as TileKind].order -
                    TileKinds[b.id as TileKind].order,
            );
    }

    replace(tile: Tile, newTile: Tile) {
        const index = this.tiles.indexOf(tile);
        if (index < 0) return this;
        const newTiles = [...this.tiles];
        newTiles[index] = newTile;
        return new Layout(
            this.projectID,
            newTiles,
            this.fullscreenID,
            this.splits,
        );
    }

    withTiles(tiles: Tile[]) {
        return new Layout(
            this.projectID,
            [...tiles],
            this.fullscreenID,
            this.splits,
        );
    }

    /**  Adds any of the given tiles not in the current layout, based on id.*/
    withMissingTiles(tiles: Tile[]) {
        const newTiles = tiles.filter(
            (tile) => !this.tiles.some((t) => t.id === tile.id),
        );
        return this.withTiles([...this.tiles, ...newTiles]);
    }

    withTileLast(tile: Tile) {
        const index = this.tiles.findIndex((t) => t.id === tile.id);
        return index < 0
            ? this
            : this.withTiles([
                  ...this.tiles.filter((t) => t.id !== tile.id),
                  tile,
              ]);
    }

    withTileBounds(tile: Tile, bounds: Bounds) {
        return this.replace(tile, tile.withBounds(bounds));
    }

    getTileBounds(tile: Tile) {
        return (
            tile.bounds ?? {
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            }
        );
    }

    withTilePosition(tile: Tile, bounds: Bounds) {
        return this.replace(tile, tile.withPosition(bounds));
    }

    withTileInMode(tile: Tile, mode: TileMode) {
        return this.replace(tile, tile.withMode(mode));
    }

    /** Set the fullscreen tile to the given tile ID and ensure that it's expanded. */
    withFullscreen(tileID: string | undefined) {
        return new Layout(
            this.projectID,
            this.tiles.map((tile) =>
                // If there's a fullscreen id set, make sure this one is visible.
                tileID !== undefined && tile.id === tileID
                    ? tile.withMode(TileMode.Expanded)
                    : // Otherwise, just reuse the title as is.
                      tile,
            ),
            tileID,
            this.splits,
        );
    }

    withoutFullscreen() {
        return new Layout(this.projectID, this.tiles, undefined, this.splits);
    }

    collapsed() {
        return this.tiles.filter((tile) => tile.mode === TileMode.Collapsed);
    }

    expanded() {
        return this.tiles.filter((tile) => tile.mode !== TileMode.Collapsed);
    }

    static getComputedLayout(
        arrangement: Arrangement,
        width: number,
        height: number,
    ) {
        // If the arrangement is responsible, choose the appropriate layout;
        return arrangement === Arrangement.Responsive
            ? // Mobile size? Single only.
              height < 500 || width < 500
                ? Arrangement.Single
                : // Tablet size? Split view.
                  height < 700 || width < 700
                  ? Arrangement.Split
                  : width > height
                    ? Arrangement.Horizontal
                    : Arrangement.Vertical
            : arrangement;
    }

    resized(arrangement: Arrangement, width: number, height: number) {
        arrangement = Layout.getComputedLayout(arrangement, width, height);

        return arrangement === Arrangement.Vertical
            ? this.vertical(width, height)
            : arrangement === Arrangement.Horizontal
              ? this.horizontal(width, height)
              : arrangement === Arrangement.Split
                ? this.split(width, height)
                : arrangement === Arrangement.Single
                  ? this.single(width, height)
                  : arrangement === Arrangement.Free
                    ? this.positioned()
                    : this;
    }

    /** Take a generic specification for a layout on axes, determining the position and size of each tile. */
    onAxes(axes: Axis[], width: number, height: number): Layout {
        // Make a new layout that we'll iteratively update.
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            this.splits,
        );

        // Given a layout and direction, layout all of the position and size of the tiles on the corresponding axis.
        function position(layout: Layout, direction: 'x' | 'y') {
            // Find the axes on this direction.
            const correspondingAxes = axes.filter(
                (a) => a.direction === direction,
            );

            // Determine the length on this axis
            const length = direction === 'x' ? width : height;

            // For each axes, determine the position and size of the tiles on this axis.
            for (const axis of correspondingAxes) {
                // Track the previous position and length on the axis, so we can position each tile appropriately.
                let previousPosition = undefined;

                // For each of the splits on this axis, determine if the referenced tiles are visible, and
                // if so, set their position based on the requested position and their size based on the position of the
                // position of the next visible tile, or the remainder of the axis if there are no visible tiles after it.
                for (let index = 0; index < axis.positions.length; index++) {
                    const group = axis.positions[index];
                    // Get the tiles referenced in this split and see if they are expanded.
                    const visibleTiles = layout.tiles.filter(
                        (t) => group.id.includes(t.kind) && t.isExpanded(),
                    );

                    // Get the group with an expanded tile after this group, if any.
                    const subsequentVisibleTile: Position | undefined =
                        axis.positions
                            .slice(index + 1)
                            .filter((split) =>
                                split.id.some((id) =>
                                    layout.tiles.find(
                                        (t) => t.kind === id && t.isExpanded(),
                                    ),
                                ),
                            )[0];

                    // Set the position of the tiles based on the requested position.
                    // Set the width/height of the tile based on the position of the next tile or the end of the axis.
                    const proporitionalPosition =
                        previousPosition === undefined ? 0 : group.position;
                    const position: number =
                        previousPosition === undefined
                            ? 0
                            : proporitionalPosition * length;
                    const size =
                        ((subsequentVisibleTile
                            ? subsequentVisibleTile.position
                            : 1) -
                            proporitionalPosition) *
                        length;

                    // Remember what we chose.
                    if (visibleTiles.length > 0) previousPosition = position;

                    // Split the visible tiles into groups based on their kind.
                    const visibleKinds = new Map<TileKind, Tile[]>();
                    for (const tile of visibleTiles) {
                        const kind = tile.kind;
                        if (!visibleKinds.has(kind)) visibleKinds.set(kind, []);
                        visibleKinds.get(kind)?.push(tile);
                    }

                    // Split up the space for each type of visible tile.
                    for (const tiles of visibleKinds.values()) {
                        let currentPosition = position;
                        for (const tile of tiles) {
                            const currentBounds = layout.getTileBounds(tile);
                            layout = layout.withTileBounds(tile, {
                                ...currentBounds,
                                ...(direction === 'x'
                                    ? {
                                          left: group.split
                                              ? currentPosition
                                              : position,
                                          width: group.split
                                              ? size / tiles.length
                                              : size,
                                      }
                                    : {
                                          top: group.split
                                              ? currentPosition
                                              : position,
                                          height: group.split
                                              ? size / tiles.length
                                              : size,
                                      }),
                            });
                            currentPosition += size / tiles.length;
                        }
                    }
                }
            }
            return layout;
        }

        // Layout on each axis according to the specification.
        newLayout = position(newLayout, 'x');
        newLayout = position(newLayout, 'y');

        return newLayout;
    }

    /* A stack of output and source files with optional palette next to output and docs next to source */
    vertical(width: number, height: number) {
        return this.onAxes(
            this.splits?.vertical ?? DefaultVerticalSplits,
            width,
            height,
        );
    }

    /* Docs on the left, then source, then output, with optional palette below it */
    horizontal(width: number, height: number) {
        return this.onAxes(
            this.splits?.horizontal ?? DefaultHorizontalSplits,
            width,
            height,
        );
    }

    /** Only two visible at a time, whichever two are last in the list of tiles */
    split(width: number, height: number) {
        // Find the last two visible tiles
        const visibleTiles = this.tiles
            .filter((tile) => tile.isExpanded())
            .slice(-2);

        let newLayout: Layout = this;

        // Make the tile take up all the space
        for (const tile of visibleTiles) {
            const first = visibleTiles[0] === tile;
            newLayout = newLayout.withTileBounds(
                tile,
                width < height
                    ? {
                          left: 0,
                          top: first ? 0 : height / visibleTiles.length,
                          width,
                          height: height / visibleTiles.length,
                      }
                    : {
                          left: first ? 0 : width / visibleTiles.length,
                          top: 0,
                          width: width / visibleTiles.length,
                          height,
                      },
            );
        }

        // Make up all the other tiles take up no space.
        for (const tile of this.tiles) {
            if (!visibleTiles.includes(tile)) {
                newLayout = newLayout.withTileBounds(tile, {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                });
            }
        }

        return newLayout;
    }

    /** Only one visible at a time, whichever is first */
    single(width: number, height: number) {
        // Visible tile
        const visibleTile = this.tiles.findLast((tile) => tile.isExpanded());

        if (visibleTile === undefined) return this;

        // Make the tile take up all the space
        let newLayout = this.withTileBounds(visibleTile, {
            left: 0,
            top: 0,
            width,
            height,
        });

        // Make up all the other tiles take up no space.
        for (const tile of this.tiles) {
            if (tile.id !== visibleTile.id) {
                newLayout = newLayout.withTileBounds(tile, {
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                });
            }
        }

        return newLayout;
    }

    positioned() {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            this.splits,
        );
        for (const tile of this.tiles)
            newLayout = newLayout.withTileBounds(tile, tile.position);
        return newLayout;
    }

    randomPositions(width: number, height: number) {
        const positions = new Map<string, Bounds>();
        const tiles = this.tiles;
        const tileWidth = width / (tiles.length / 2);
        const tileHeight = height / (tiles.length / 2);

        for (const tile of tiles) {
            positions.set(tile.id, {
                left: Math.random() * (width - tileWidth),
                top: Math.random() * (height - tileHeight),
                width: tileWidth,
                height: tileHeight,
            });
        }
        return positions;
    }

    withSplit(
        arrangement: Arrangement,
        axis: number,
        index: number,
        split: number,
        width: number,
        height: number,
    ) {
        // Constrain the split
        if (split < 0) split = 0;
        if (split > 1) split = 1;

        if (
            arrangement !== Arrangement.Horizontal &&
            arrangement !== Arrangement.Vertical &&
            arrangement !== Arrangement.Responsive
        )
            return this;
        const horizontal =
            arrangement === Arrangement.Horizontal ||
            (arrangement === Arrangement.Responsive && width > height);

        // Initialize the splits if null.
        let newSplits = JSON.parse(
            JSON.stringify(
                this.splits ?? {
                    horizontal: DefaultHorizontalSplits,
                    vertical: DefaultVerticalSplits,
                },
            ),
        );

        // Update the split at the given index.
        if (horizontal && newSplits.horizontal !== null) {
            if (newSplits.horizontal[axis].positions[index].position === split)
                return this;
            newSplits.horizontal[axis].positions[index].position = split;
        } else if (!horizontal && newSplits.vertical !== null) {
            if (newSplits.vertical[axis].positions[index].position === split)
                return this;
            newSplits.vertical[axis].positions[index].position = split;
        }

        return new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            newSplits,
        );
    }

    isEqualTo(layout: Layout) {
        return (
            layout.fullscreenID === this.fullscreenID &&
            this.tiles.length === layout.tiles.length &&
            this.tiles.every((t, index) => t.isEqualTo(layout.tiles[index])) &&
            JSON.stringify(this.splits) === JSON.stringify(layout.splits)
        );
    }
}
