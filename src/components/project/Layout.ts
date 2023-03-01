import type Bounds from './Bounds';
import { Content, Mode } from './Tile';
import Tile from './Tile';

export enum Arrangement {
    vertical = 'vertical',
    horizontal = 'horizontal',
    free = 'free',
}

export const OutputID = 'output';
export const PaletteID = 'palette';
export const DocsID = 'docs';

export type LayoutObject = {
    project: string;
    fullscreen: string | null;
    tiles: {
        id: string;
        expanded: boolean;
        bounds: Bounds | null;
        position: Bounds;
        name: string;
        kind: Content;
    }[];
    arrangement: Arrangement;
};

export default class Layout {
    readonly tiles: Tile[];
    readonly arrangement: Arrangement;
    readonly fullscreenID: string | undefined;

    constructor(
        tiles: Tile[],
        arrangement: Arrangement,
        fullscreenID: string | undefined
    ) {
        this.arrangement = arrangement;
        this.fullscreenID = fullscreenID;
        this.tiles = tiles;
    }

    toObject(project: string): LayoutObject {
        return {
            project,
            fullscreen: this.fullscreenID ?? null,
            tiles: this.tiles.map((tile) => {
                return {
                    id: tile.id,
                    kind: tile.kind,
                    name: tile.name,
                    bounds: tile.bounds ?? null,
                    expanded: tile.mode === Mode.Expanded,
                    position: tile.position,
                };
            }),
            arrangement: this.arrangement,
        };
    }

    static fromObject(project: string, layout: LayoutObject | null) {
        return layout === null || layout.project !== project
            ? null
            : new Layout(
                  layout.tiles.map(
                      (tile) =>
                          new Tile(
                              tile.id,
                              tile.name,
                              tile.kind,
                              tile.expanded ? Mode.Expanded : Mode.Collapsed,
                              tile.bounds ?? undefined,
                              tile.position ?? undefined
                          )
                  ),
                  layout.arrangement,
                  layout.fullscreen ?? undefined
              );
    }

    isFullscreen() {
        return this.fullscreenID !== undefined;
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
        return this.getTileWithID(PaletteID);
    }

    getOutput() {
        return this.getTileWithID(OutputID);
    }

    getDocs() {
        return this.getTileWithID(DocsID);
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
                  [
                      ...this.tiles.slice(0, index),
                      newTile,
                      ...this.tiles.slice(index + 1),
                  ],
                  this.arrangement,
                  this.fullscreenID
              );
    }

    withTiles(tiles: Tile[]) {
        return new Layout(tiles, this.arrangement, this.fullscreenID);
    }

    withTileLast(tile: Tile) {
        const index = this.tiles.findIndex((t) => t.id === tile.id);
        return index < 0
            ? this
            : new Layout(
                  [
                      ...this.tiles.slice(0, index),
                      ...this.tiles.slice(index + 1),
                      tile,
                  ],
                  this.arrangement,
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

    withFullscreen(tileID: string) {
        return new Layout(this.tiles, this.arrangement, tileID);
    }

    withoutFullscreen() {
        return new Layout(this.tiles, this.arrangement, undefined);
    }

    collapsed() {
        return this.tiles.filter((tile) => tile.mode === Mode.Collapsed);
    }

    expanded() {
        return this.tiles.filter((tile) => tile.mode !== Mode.Collapsed);
    }

    withNextArrangement(_: number, __: number) {
        return new Layout(
            this.tiles,
            this.arrangement === Arrangement.vertical
                ? Arrangement.horizontal
                : this.arrangement === Arrangement.horizontal
                ? Arrangement.free
                : Arrangement.vertical,
            this.fullscreenID
        );
    }

    withArrangement(arrangement: Arrangement) {
        return new Layout(this.tiles, arrangement, this.fullscreenID);
    }

    resized(width: number, height: number) {
        return this.arrangement === Arrangement.vertical
            ? this.vertical(width, height)
            : this.arrangement === Arrangement.horizontal
            ? this.horizontal(width, height)
            : this.positioned();
    }

    /* A stack of output and source files with optional palette next to output and docs next to source */
    vertical(width: number, height: number) {
        let newLayout: Layout = this;
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === OutputID);
        const palette = expanded.find((tile) => tile.id === PaletteID);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find((tile) => tile.id === DocsID);

        let top = 0;
        let tileHeight =
            height / ((output || palette ? 1 : 0) + sources.length);

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
                width: (width * 1) / 3,
                height: tileHeight * sources.length,
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
        let newLayout: Layout = this;
        const expanded = this.expanded();

        const output = expanded.find((tile) => tile.id === OutputID);
        const palette = expanded.find((tile) => tile.id === PaletteID);
        const sources = expanded.filter((tile) => tile.id.startsWith('source'));
        const docs = expanded.find((tile) => tile.id === DocsID);

        let left = 0;
        let tileWidth =
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
        let newLayout: Layout = this;
        for (const tile of this.tiles)
            newLayout = newLayout.withTileBounds(tile, tile.position);
        return newLayout;
    }

    randomPositions(width: number, height: number) {
        let positions = new Map<string, Bounds>();
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
}
