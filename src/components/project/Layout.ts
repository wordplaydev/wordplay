import Arrangement from '../../db/Arrangement';
import type Bounds from './Bounds';
import { TileKind, Mode } from './Tile';
import Tile from './Tile';
import TileKinds from './TileKinds';

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
        fullscreenID: string | undefined,
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
                              tile.position ?? undefined,
                          ),
                  ),
                  layout.fullscreen ?? undefined,
              );
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
              );
    }

    withTiles(tiles: Tile[]) {
        return new Layout(this.projectID, tiles, this.fullscreenID);
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
                tile.id === tileID ? tile.withMode(Mode.Expanded) : tile,
            ),
            tileID,
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
            this.fullscreenID,
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
        const tileHeight =
            height /
            ((output ? 1 : 0) +
                (palette ? 1 : 0) +
                (docs ? 1 : 0) +
                (chat ? 1 : 0) +
                sources.length);

        // The vertical layout is a stack of tiles, with the output at the top, followed by the sources, then other tiles.

        // If the output is expanded, give it a portion.
        if (output) {
            newLayout = newLayout.withTileBounds(output, {
                left: 0,
                top: top,
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
                height: tileHeight,
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
    }

    /* Docs on the left, then source, then output, with optional palette below it */
    horizontal(width: number, height: number) {
        let newLayout: Layout = new Layout(
            this.projectID,
            this.tiles,
            this.fullscreenID,
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
            if (docs && chat) {
                newLayout = newLayout
                    .withTileBounds(docs, {
                        left: left,
                        top: 0,
                        width: tileWidth / 2,
                        height: height / 2,
                    })
                    .withTileBounds(chat, {
                        left: left,
                        top: height / 2,
                        width: tileWidth / 2,
                        height: height / 2,
                    });
            } else if (docs) {
                newLayout = newLayout.withTileBounds(docs, {
                    left: left,
                    top: 0,
                    width: tileWidth / 2,
                    height: height,
                });
            } else if (chat) {
                newLayout = newLayout.withTileBounds(chat, {
                    left: left,
                    top: 0,
                    width: tileWidth / 2,
                    height: height,
                });
            }
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
            this.fullscreenID,
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
