import type Bounds from './Bounds';

export enum Mode {
    Expanded = 'expanded',
    Collapsed = 'collapsed',
}

export enum Content {
    Output = 'output',
    Documentation = 'docs',
    Source = 'source',
    Palette = 'palette',
}

export default class Tile {
    /** An internal name for lookups */
    readonly id: string;
    /** The type of window content */
    readonly kind: Content;
    /** A creator visible name for display */
    readonly name: string;
    /** The current position of the tile in the browser window */
    readonly bounds: Bounds | undefined;
    /** The persisted position of the tile in free form layout */
    readonly position: Bounds;
    /** The layout mode the window is in */
    readonly mode: Mode;

    constructor(
        id: string,
        name: string,
        kind: Content,
        mode: Mode,
        bounds: Bounds | undefined,
        position: Bounds
    ) {
        this.id = id;
        this.name = name;
        this.kind = kind;
        this.bounds = bounds;
        this.mode = mode;
        this.position = position;
    }

    isCollapsed() {
        return this.mode == Mode.Collapsed;
    }

    isExpanded() {
        return this.mode === Mode.Expanded;
    }

    isSource() {
        return this.kind === Content.Source;
    }

    getOrder() {
        return this.kind === Content.Palette
            ? 0
            : this.kind === Content.Output
            ? 1
            : this.kind === Content.Documentation
            ? 2
            : 3;
    }

    withName(name: string) {
        return new Tile(
            this.id,
            name,
            this.kind,
            this.mode,
            this.bounds,
            this.position
        );
    }

    withBounds(bounds: Bounds) {
        return new Tile(
            this.id,
            this.name,
            this.kind,
            this.mode,
            bounds,
            this.position
        );
    }

    withPosition(bounds: Bounds) {
        return new Tile(
            this.id,
            this.name,
            this.kind,
            this.mode,
            this.bounds,
            bounds
        );
    }

    withMode(mode: Mode) {
        return new Tile(
            this.id,
            this.name,
            this.kind,
            mode,
            this.bounds,
            this.position
        );
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
            this.name === tile.name &&
            this.kind === tile.kind &&
            this.mode === tile.mode &&
            this.position.left === tile.position.left &&
            this.position.top === tile.position.top &&
            this.position.width === tile.position.width &&
            this.position.height === tile.position.height
        );
    }
}
