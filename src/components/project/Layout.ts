import Arrangement from '../../db/Arrangement';
import type Bounds from './Bounds';
import { TileKind, Mode } from './Tile';
import Tile from './Tile';

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
};

export default class Layout {
    readonly projectID: string;
    readonly tiles: Tile[];
    readonly fullscreenID: string | undefined;

    constructor(
        projectID: string,
        tiles: Tile[],
        fullscreenID: string | undefined
    ) {
        this.projectID = projectID;
        this.fullscreenID = fullscreenID;
        this.tiles = tiles;
    }

    toObject(): SerializedLayout {
        return {
            fullscreen: this.fullscreenID ?? null,
            tiles: this.tiles.map((tile) => {
                return {
                    id: tile.id,
                    kind: tile.kind,
                    bounds: tile.bounds ?? null,
                    expanded: tile.mode === Mode.Expanded,
                    position: tile.position,
                };
            }),
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
                              tile.expanded ? Mode.Expanded : Mode.Collapsed,
                              tile.bounds ?? undefined,
                              tile.position ?? undefined
                          )
                  ),
                  layout.fullscreen ?? undefined
              );
    }

    isFullscreen() {
        return this.fullscreenID !== undefined;
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

    getSources() {
        return this.tiles.filter((tile) => tile.id.startsWith('source'));
    }

    getNonSources() {
        return this.tiles
            .filter((tile) => !tile.id.startsWith('source'))
            .sort((a, b) => a.id.localeCompare(b.id));
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
                  this.fullscreenID
              );
    }

    withTiles(tiles: Tile[]) {
        return new Layout(this.projectID, tiles, this.fullscreenID);
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
                  this.fullscreenID
              );
    }

    withTileBounds(tile: Tile, bounds: Bounds) {
        return this.replace(tile, tile.withBounds(bounds));
    }

    withTilePosition(tile: Tile, bounds: Bounds) {
        return this.replace(tile, tile.withPosition(bounds));
    }

    withTileInMode(tile: Tile, mode: Mode) {
        return this.replace(tile, tile.withMode(mode));
    }

    /** Set the fullscreen tile to the given tile ID and ensure that it's expanded. */
    withFullscreen(tileID: string | undefined) {
        return new Layout(
            this.projectID,
            this.tiles.map((tile) =>
                tile.id === tileID ? tile.withMode(Mode.Expanded) : tile
            ),
            tileID
        );
    }

    withoutFullscreen() {
        return new Layout(this.projectID, this.tiles, undefined);
    }

    collapsed() {
        return this.tiles.filter((tile) => tile.mode === Mode.Collapsed);
    }

    expanded() {
        return this.tiles.filter((tile) => tile.mode !== Mode.Collapsed);
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

    /* A stack of output and source files with optional palette next to output and docs next to source */
    vertical(width: number, height: number) {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID
        );
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === TileKind.Output);
        const palette = expanded.find((tile) => tile.id === TileKind.Palette);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find(
            (tile) => tile.id === TileKind.Documentation
        );

        let top = 0;
        const tileHeight =
            height /
            ((output || palette ? 1 : 0) +
                (sources.length + (sources.length === 0 && docs ? 1 : 0)));

        // If the output is expanded, give it a portion.
        if (output) {
            // If the palette is expanded, give it a third of the width.
            if (palette) {
                newLayout = newLayout
                    .withTileBounds(output, {
                        left: width / 3,
                        top: top,
                        width: (width * 2) / 3,
                        height: tileHeight,
                    })
                    .withTileBounds(palette, {
                        left: 0,
                        top: top,
                        width: (width * 1) / 3,
                        height: tileHeight,
                    });
            }
            // No palette, give it all the width.
            else {
                newLayout = newLayout.withTileBounds(output, {
                    left: 0,
                    top: top,
                    width,
                    height: tileHeight,
                });
            }
            top += tileHeight;
        } else if (palette) {
            newLayout = newLayout.withTileBounds(palette, {
                left: 0,
                top: top,
                width,
                height: tileHeight,
            });
            top += tileHeight;
        }

        if (docs)
            newLayout = newLayout.withTileBounds(docs, {
                left: 0,
                top: top,
                width: sources.length > 0 ? (width * 1) / 3 : width,
                height:
                    sources.length > 0
                        ? tileHeight * sources.length
                        : tileHeight,
            });

        for (const tile of sources) {
            newLayout = newLayout.withTileBounds(tile, {
                left: docs ? width / 3 : 0,
                top: top,
                width: docs ? (width * 2) / 3 : width,
                height: tileHeight,
            });
            top += tileHeight;
        }
        return newLayout;
    }

    /* Docs on the left, then source, then output, with optional palette below it */
    horizontal(width: number, height: number) {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID
        );
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === TileKind.Output);
        const palette = expanded.find((tile) => tile.id === TileKind.Palette);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find(
            (tile) => tile.id === TileKind.Documentation
        );

        let left = 0;
        const tileWidth =
            width /
            ((docs ? 0.5 : 0) + sources.length + (output || palette ? 1 : 0));

        // Docs first, if expanded, gets half a tile width
        if (docs) {
            newLayout = newLayout.withTileBounds(docs, {
                left: left,
                top: 0,
                width: tileWidth / 2,
                height: height,
            });
            left += tileWidth / 2;
        }

        // Sources next
        for (const tile of sources) {
            newLayout = newLayout.withTileBounds(tile, {
                left: left,
                top: 0,
                width: tileWidth,
                height: height,
            });
            left += tileWidth;
        }

        if (output && palette) {
            newLayout = newLayout
                .withTileBounds(output, {
                    left: left,
                    top: 0,
                    width: tileWidth,
                    height: height / 2,
                })
                .withTileBounds(palette, {
                    left: left,
                    top: height / 2,
                    width: tileWidth,
                    height: height / 2,
                });
        } else if (output) {
            newLayout = newLayout.withTileBounds(output, {
                left: left,
                top: 0,
                width: tileWidth,
                height: height,
            });
        } else if (palette) {
            newLayout = newLayout.withTileBounds(palette, {
                left: left,
                top: 0,
                width: tileWidth,
                height: height,
            });
        }

        return newLayout;
    }

    positioned() {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID
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

    isEqualTo(layout: Layout) {
        return (
            layout.fullscreenID === this.fullscreenID &&
            this.tiles.length === layout.tiles.length &&
            this.tiles.every((t, index) => t.isEqualTo(layout.tiles[index]))
        );
    }
}
