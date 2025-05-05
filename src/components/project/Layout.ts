import Arrangement from '../../db/settings/Arrangement';
import type Bounds from './Bounds';
import Tile, { TileKind, TileMode } from './Tile';
import TileKinds from './TileKinds';

export type Split = {
    /** A set of tile kinds or a source numbers that this is laying out. */
    id: (TileKind | number)[];
    /** The proportion of the dimension the tile should receive, if expanded, between 0 and 1 */
    proportion: number;
};

export type Axis = {
    /** The axis this corresponds to */
    direction: 'x' | 'y';
    /** The splits to apply; should be monotonically increasing */
    splits: Split[];
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
        splits: [
            { id: [TileKind.Documentation], proportion: 0.5 },
            { id: [TileKind.Collaborate], proportion: 0.5 },
        ],
    },
    {
        direction: 'x',
        splits: [
            {
                id: [TileKind.Documentation, TileKind.Collaborate],
                proportion: 0.25,
            },
            { id: [TileKind.Source], proportion: 0.5 },
            {
                id: [TileKind.Output, TileKind.Palette],
                proportion: 0.25,
            },
        ],
    },
    {
        direction: 'y',
        splits: [
            { id: [TileKind.Output], proportion: 0.5 },
            { id: [TileKind.Palette], proportion: 0.5 },
        ],
    },
];

const DefaultVerticalSplits: Axis[] = [
    {
        direction: 'x',
        splits: [
            { id: [TileKind.Documentation], proportion: 0.5 },
            { id: [TileKind.Collaborate], proportion: 0.5 },
        ],
    },
    {
        direction: 'y',
        splits: [
            {
                id: [TileKind.Documentation, TileKind.Collaborate],
                proportion: 0.25,
            },
            { id: [TileKind.Source], proportion: 0.5 },
            {
                id: [TileKind.Output, TileKind.Palette],
                proportion: 0.25,
            },
        ],
    },
    {
        direction: 'x',
        splits: [
            { id: [TileKind.Output], proportion: 0.5 },
            { id: [TileKind.Palette], proportion: 0.5 },
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
    getSplits(arrangement: Arrangement) {
        return arrangement === Arrangement.Horizontal
            ? (this.splits?.horizontal ?? DefaultHorizontalSplits)
            : arrangement === Arrangement.Vertical
              ? (this.splits?.vertical ?? DefaultVerticalSplits)
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
        return this.tiles.sort((a, b) => a.getOrder() - b.getOrder());
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
        return index < 0
            ? this
            : new Layout(
                  this.projectID,
                  [
                      ...this.tiles.slice(0, index),
                      newTile,
                      ...this.tiles.slice(index + 1),
                  ],
                  this.fullscreenID,
                  this.splits,
              );
    }

    withTiles(tiles: Tile[]) {
        return new Layout(
            this.projectID,
            tiles,
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
            : new Layout(
                  this.projectID,
                  [
                      ...this.tiles.slice(0, index),
                      ...this.tiles.slice(index + 1),
                      tile,
                  ],
                  this.fullscreenID,
                  this.splits,
              );
    }

    withTileBounds(tile: Tile, bounds: Bounds) {
        return this.replace(tile, tile.withBounds(bounds));
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
                tile.id === tileID ? tile.withMode(TileMode.Expanded) : tile,
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

    resized(arrangement: Arrangement, width: number, height: number) {
        return arrangement === Arrangement.Responsive
            ? width > height
                ? this.horizontal(width, height)
                : this.vertical(width, height)
            : arrangement === Arrangement.Vertical
              ? this.vertical(width, height)
              : arrangement === Arrangement.Horizontal
                ? this.horizontal(width, height)
                : this.positioned();
    }

    /** Take a generic specification for a layout on axes, determining the position and size of each tile. */
    onAxes(axes: Axis[], width: number, height: number): Layout {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            this.splits,
        );

        const thisLayout = this;

        function position(layout: Layout, direction: 'x' | 'y') {
            // Go through the axis and position and size the visible tiles.
            const xAxes = axes.filter((a) => a.direction === 'x');
            for (const axis of xAxes) {
                let position = 0;
                let unusedProportion = 0;
                // For each of the splits on this axis, determine if the relevant tiles are visible, and
                // if so, position and size them based on the proporition allocated to them, plus
                // any previous space unused, and any space after unused.
                for (let index = 0; index < axis.splits.length; index++) {
                    const split = axis.splits[index];
                    // Get the tiles referenced in this split and see if they are expanded.
                    const tiles = split.id
                        .map((id) =>
                            thisLayout.tiles.find(
                                (t) => t.kind === id && t.isExpanded(),
                            ),
                        )
                        .filter((t) => t !== undefined);

                    // Get the tiles on this axis after this split and see if any are expanded.
                    const subsequentTilesVisible =
                        axis.splits
                            .slice(index + 1)
                            .filter((split) =>
                                split.id.some((id) =>
                                    thisLayout.tiles.find(
                                        (t) => t.kind === id && t.isExpanded(),
                                    ),
                                ),
                            ).length > 0;

                    // TODO Are any future tiles visible? If not, it gets the remaining space.

                    const proportion = split.proportion + unusedProportion;
                    // No tiles visible for this split? Give up unused proportion.
                    if (tiles.length === 0) unusedProportion += proportion;
                    // Otherwise, reset the unused proporition, and position the tiles on this axis.
                    else {
                        unusedProportion = 0;
                        const size = width * proportion;
                        for (const tile of tiles) {
                            newLayout = newLayout.withTileBounds(tile, {
                                left: position,
                                top: 0,
                                width: size,
                                height: 0,
                            });
                        }

                        // Advance the x based on the tile width.
                        position += size;
                    }
                }
            }
            return layout;
        }

        // Layout on each axis according to the specification.
        newLayout = position(newLayout, 'x');
        newLayout = position(newLayout, 'y');
    }

    /* A stack of output and source files with optional palette next to output and docs next to source */
    vertical(width: number, height: number) {
        return this.onAxes(
            this.splits?.vertical ?? DefaultVerticalSplits,
            width,
            height,
        );

        /*
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            this.splits,
        );
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === TileKind.Output);
        const palette = expanded.find((tile) => tile.id === TileKind.Palette);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find(
            (tile) => tile.id === TileKind.Documentation,
        );
        const chat = expanded.find((tile) => tile.id === TileKind.Collaborate);

        let top = 0;
        let tileCount =
            (output ? 1 : 0) +
            (palette ? 1 : 0) +
            (docs ? 1 : 0) +
            (chat ? 1 : 0) +
            sources.length;
        const tileProportion = 1 / tileCount;
        const tileHeight = height * tileProportion;

        // The vertical layout is a stack of tiles, with the output at the top, followed by the sources, then other tiles.

        const splits =
            this.splits && this.splits.vertical
                ? this.splits.vertical.map((s) => s ?? 1 / tileCount)
                : undefined;

        // If the output is expanded, give it a portion.
        if (output) {
            newLayout = newLayout.withTileBounds(output, {
                left: 0,
                top: 0,
                width: width,
                height: tileHeight,
            });
            top += tileHeight;
        }

        // Add the sources next
        for (const tile of sources) {
            newLayout = newLayout.withTileBounds(tile, {
                left: 0,
                top: top,
                width: width,
                height: tileHeight,
            });
            top += tileHeight;
        }

        // Then add the palette
        if (palette) {
            newLayout = newLayout.withTileBounds(palette, {
                left: 0,
                top: top,
                width: width,
                height: tileHeight,
            });
            top += tileHeight;
        }

        if (docs) {
            newLayout = newLayout.withTileBounds(docs, {
                left: 0,
                top: top,
                width: width,
                height:
                    tileHeight - (splits ? tileHeight * (0.5 - splits[3]) : 0),
            });
            top += tileHeight;
        }

        if (chat) {
            newLayout = newLayout.withTileBounds(chat, {
                left: 0,
                top: top,
                width: width,
                height: tileHeight,
            });
        }

        return newLayout;
        */
    }

    /* Docs on the left, then source, then output, with optional palette below it */
    horizontal(width: number, height: number) {
        return this.onAxes(
            this.splits?.horizontal ?? DefaultHorizontalSplits,
            width,
            height,
        );

        /*

        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
            this.splits,
        );
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === TileKind.Output);
        const palette = expanded.find((tile) => tile.id === TileKind.Palette);
        const chat = expanded.find((tile) => tile.id === TileKind.Collaborate);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find(
            (tile) => tile.id === TileKind.Documentation,
        );

        let left = 0;
        const tileWidth =
            width /
            ((docs || chat ? 0.5 : 0) +
                sources.length +
                (output || palette ? 1 : 0));

        // Docs first, if expanded, gets half a tile width
        if (docs || chat) {
            const leftCodeSplit =
                this.splits && this.splits.horizontal
                    ? (this.splits.horizontal[1] ?? 0.5)
                    : 0.5;

            const leftWidth = tileWidth * leftCodeSplit;

            if (docs && chat) {
                const docChatSplit =
                    this.splits && this.splits.horizontal
                        ? (this.splits.horizontal[0] ?? 0.5)
                        : 0.5;

                newLayout = newLayout
                    .withTileBounds(docs, {
                        left: left,
                        top: 0,
                        width: leftWidth,
                        height: height * docChatSplit,
                    })
                    .withTileBounds(chat, {
                        left: left,
                        top: height * docChatSplit,
                        width: leftWidth,
                        height: height * (1 - docChatSplit),
                    });
            } else if (docs) {
                newLayout = newLayout.withTileBounds(docs, {
                    left: left,
                    top: 0,
                    width: leftWidth,
                    height: height,
                });
            } else if (chat) {
                newLayout = newLayout.withTileBounds(chat, {
                    left: left,
                    top: 0,
                    width: leftWidth,
                    height: height,
                });
            }
            left += tileWidth * leftCodeSplit;
        }

        // Get the source/right margin split.
        const rightCodeSplit =
            this.splits && this.splits.horizontal
                ? (this.splits.horizontal[2] ?? 0.5)
                : 0.5;
        const extraRight =
            output || palette ? tileWidth * (0.5 - rightCodeSplit) : 0;
        const sourceWidth = tileWidth - extraRight;

        // Sources next
        for (const tile of sources) {
            newLayout = newLayout.withTileBounds(tile, {
                left: left,
                top: 0,
                width: sourceWidth,
                height: height,
            });
            left += sourceWidth;
        }

        if (output && palette) {
            const split =
                this.splits && this.splits.horizontal
                    ? (this.splits.horizontal[3] ?? 0.5)
                    : 0.5;

            newLayout = newLayout
                .withTileBounds(output, {
                    left: left,
                    top: 0,
                    width: tileWidth + extraRight,
                    height: height * split,
                })
                .withTileBounds(palette, {
                    left: left,
                    top: height * split,
                    width: tileWidth + extraRight,
                    height: height * (1 - split),
                });
        } else if (output) {
            newLayout = newLayout.withTileBounds(output, {
                left: left,
                top: 0,
                width: tileWidth + extraRight,
                height: height,
            });
        } else if (palette) {
            newLayout = newLayout.withTileBounds(palette, {
                left: left,
                top: 0,
                width: tileWidth + extraRight,
                height: height,
            });
        }

        return newLayout;

        */
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
    ) {
        if (
            arrangement !== Arrangement.Horizontal &&
            arrangement !== Arrangement.Vertical
        )
            return this;
        const horizontal = arrangement === Arrangement.Horizontal;

        // Initialize the splits if null.
        let newSplits = this.splits ?? {
            horizontal: DefaultHorizontalSplits,
            vertical: DefaultVerticalSplits,
        };

        // Update the split at the given index.
        if (horizontal && newSplits.horizontal !== null)
            newSplits.horizontal[axis].splits[index].proportion = split;
        else if (!horizontal && newSplits.vertical !== null)
            newSplits.vertical[axis].splits[index].proportion = split;

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
