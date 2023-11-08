import type Locales from '../../locale/Locales';
import type Project from '../../models/Project';
import type Bounds from './Bounds';
import Layout from './Layout';

export enum Mode {
    Expanded = 'expanded',
    Collapsed = 'collapsed',
}

export enum TileKind {
    Output = 'output',
    Documentation = 'docs',
    Source = 'source',
    Palette = 'palette',
}

export default class Tile {
    /** An internal name for lookups */
    readonly id: string;
    /** The type of window content */
    readonly kind: TileKind;
    /** The current position of the tile in the browser window */
    readonly bounds: Bounds | undefined;
    /** The persisted position of the tile in free form layout */
    readonly position: Bounds;
    /** The layout mode the window is in */
    readonly mode: Mode;

    constructor(
        id: string,
        kind: TileKind,
        mode: Mode,
        bounds: Bounds | undefined,
        position: Bounds
    ) {
        this.id = id;
        this.kind = kind;
        this.bounds = bounds;
        this.mode = mode;
        this.position = position;
    }

    /**
     * If source, gets the name of the source from the project, and if not, gets a localized name using
     * the given locales.
     */
    getName(project: Project, locales: Locales) {
        return `${
            this.getSource(project)?.getPreferredName(locales.getLocales()) ??
            locales.get((l) => l.ui.tile.label[this.kind])
        }`;
    }

    getSource(project: Project) {
        return project
            .getSources()
            .find((_, index) => Layout.getSourceID(index) === this.id);
    }

    isCollapsed() {
        return this.mode == Mode.Collapsed;
    }

    isExpanded() {
        return this.mode === Mode.Expanded;
    }

    isSource() {
        return this.kind === TileKind.Source;
    }

    getOrder() {
        return this.kind === TileKind.Palette
            ? 0
            : this.kind === TileKind.Output
            ? 1
            : this.kind === TileKind.Documentation
            ? 2
            : 3;
    }

    withBounds(bounds: Bounds) {
        return new Tile(this.id, this.kind, this.mode, bounds, this.position);
    }

    withPosition(bounds: Bounds) {
        return new Tile(this.id, this.kind, this.mode, this.bounds, bounds);
    }

    withMode(mode: Mode) {
        return new Tile(this.id, this.kind, mode, this.bounds, this.position);
    }

    static randomPosition(width: number, height: number) {
        const size = width / 2;
        return {
            left: Math.random() * (width - size),
            top: Math.random() * (height - size),
            width: size,
            height: size,
        };
    }

    isEqualTo(tile: Tile) {
        return (
            this.id === tile.id &&
            this.kind === tile.kind &&
            this.mode === tile.mode &&
            this.position.left === tile.position.left &&
            this.position.top === tile.position.top &&
            this.position.width === tile.position.width &&
            this.position.height === tile.position.height
        );
    }
}
