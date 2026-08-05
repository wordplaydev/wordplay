import { Chalk } from 'chalk';

/** The kinds of line the locale tooling emits. One table below decides each
 *  kind's symbol and color, so every script in the family reads the same. */
export type LogKind =
    'header' | 'note' | 'pending' | 'good' | 'warning' | 'bad';

export type Symbols = Record<LogKind, string>;

const UnicodeSymbols: Symbols = {
    header: '▸',
    note: '·',
    pending: '…',
    good: '✓',
    warning: '!',
    bad: '✗',
};

/** Legacy Windows consoles (conhost — anything that isn't Windows Terminal)
 *  render the glyphs above as boxes, so fall back to ASCII there. */
const AsciiSymbols: Symbols = {
    header: '>',
    note: '-',
    pending: '..',
    good: 'v',
    warning: '!',
    bad: 'x',
};

/** Chalk emits only SGR sequences, so this narrow pattern is enough to measure
 *  a colored line's visible width (batch.ts's status board needs that). */
const AnsiPattern = /\u001B\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
    return text.replace(AnsiPattern, '');
}

/**
 * Whether to emit ANSI color. Honors NO_COLOR and FORCE_COLOR (no-color.org),
 * then falls back to "a terminal, or a CI that renders ANSI anyway" — GitHub
 * Actions isn't a TTY but does render SGR, and colored errors matter most
 * there. Exported so the rule is testable without a real terminal.
 */
export function resolveColor(
    env: NodeJS.ProcessEnv = process.env,
    isTTY: boolean = process.stdout.isTTY === true,
): boolean {
    if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
    if (env.FORCE_COLOR !== undefined)
        return !['0', 'false', ''].includes(env.FORCE_COLOR);
    return isTTY || env.CI !== undefined;
}

export function resolveSymbols(
    platform: string = process.platform,
    env: NodeJS.ProcessEnv = process.env,
): Symbols {
    return platform === 'win32' && env.WT_SESSION === undefined
        ? AsciiSymbols
        : UnicodeSymbols;
}

export type LogOptions = {
    /** Where finished lines go. Defaults to stdout — never stderr, so a child's
     *  lines can't reorder against each other in batch.ts's pipe. */
    sink?: (line: string) => void;
    color?: boolean;
    symbols?: Symbols;
    /** How the process ends on a fatal or fail-fast. Injected so tests can
     *  assert the exit code without killing the test runner. */
    exit?: (code: number) => never;
};

/** The state one run shares across every logger in it, so an error reported at
 *  any depth still counts toward the root's `errorCount`. */
class Run {
    readonly failOnBad: boolean;
    readonly sink: (line: string) => void;
    readonly symbols: Symbols;
    readonly paint: Record<LogKind, (text: string) => string>;
    readonly exit: (code: number) => never;
    badCount = 0;

    constructor(failOnBad: boolean, options: LogOptions) {
        // A local Chalk instance rather than mutating the global `chalk.level`,
        // which leaked this module's choice into every other chalk user.
        const chalk = new Chalk({
            level: (options.color ?? resolveColor()) ? 1 : 0,
        });
        this.failOnBad = failOnBad;
        this.sink =
            options.sink ?? ((line) => process.stdout.write(line + '\n'));
        this.symbols = options.symbols ?? resolveSymbols();
        // Colorblind-safe by construction. Red/green is the pair deuteranopia
        // and protanopia collapse — together the most common form of color
        // vision deficiency, around 8% of men — so success is CYAN, not green.
        // Cyan/yellow/red stay mutually distinguishable under both, and differ
        // in lightness as well as hue: under protanopia red darkens toward
        // brown while yellow stays bright, so `bad` is bolded to widen that gap
        // rather than leaning on hue alone.
        //
        // Color is never the only channel regardless (WCAG 1.4.1): every kind
        // already carries its own symbol, so the palette is a second cue on top
        // of ✓ / ! / ✗, not the thing that distinguishes them.
        this.paint = {
            header: (text) => chalk.bold(text),
            note: (text) => chalk.dim(text),
            pending: (text) => chalk.dim(text),
            good: (text) => chalk.cyan(text),
            warning: (text) => chalk.yellow(text),
            bad: (text) => chalk.red.bold(text),
        };
        this.exit = options.exit ?? ((code) => process.exit(code));
    }
}

/**
 * Structured terminal feedback for the locale tooling. Indentation tracks real
 * call nesting: a logger is handed down, and every emitter returns a logger one
 * level deeper rather than mutating a shared depth — so an early return or a
 * mid-scope `exit()` can't leave the indentation wrong for the rest of a run,
 * and no call site has to name a depth. Detail lines attach to the message
 * above them by logging on what that message returned.
 */
export default class Log {
    private readonly run: Run;
    private readonly depth: number;
    /** The logger this one was opened from, so a lazy header can flush its
     *  ancestors' headers before its own line. */
    private readonly parent: Log | undefined;
    /** This logger's unprinted `scope()` header, if it has one. */
    private header: { message: string; printed: boolean } | undefined;

    /** Everything after `options` is how `deeper()`/`scope()` make a child;
     *  callers pass neither. */
    constructor(
        failOnBad = false,
        options: LogOptions = {},
        run?: Run,
        depth = 0,
        parent?: Log,
        header?: string,
    ) {
        this.run = run ?? new Run(failOnBad, options);
        this.depth = depth;
        this.parent = parent;
        this.header =
            header === undefined
                ? undefined
                : { message: header, printed: false };
    }

    /** Number of errors reported anywhere in this run, which is what start.ts
     *  turns into the process exit code. */
    get errorCount(): number {
        return this.run.badCount;
    }

    /** A logger one level deeper, sharing this run's error count and sink. */
    private deeper(): Log {
        return new Log(this.run.failOnBad, {}, this.run, this.depth + 1, this);
    }

    /** Print this logger's header, and its ancestors', if they haven't been.
     *  Deferring them is what keeps a unit of work that reported nothing from
     *  printing a header with nothing under it. */
    private printHeaders(): void {
        this.parent?.printHeaders();
        if (this.header !== undefined && !this.header.printed) {
            this.header.printed = true;
            this.write('header', this.header.message, this.depth - 1);
        }
    }

    private write(kind: LogKind, message: string, depth: number): void {
        const indent = '  '.repeat(depth);
        const symbol = this.run.symbols[kind];
        const paint = this.run.paint[kind];
        // Symbol and message are painted together so the line reads as one
        // thing; continuation lines hang under the message, not the symbol.
        const hang = ' '.repeat(symbol.length + 1);
        message.split('\n').forEach((line, index) => {
            this.run.sink(
                indent + paint(index === 0 ? `${symbol} ${line}` : hang + line),
            );
        });
    }

    private emit(kind: LogKind, message: string): Log {
        this.printHeaders();
        this.write(kind, message, this.depth);
        return this.deeper();
    }

    /** Open a nesting unit. Everything logged on the returned logger indents
     *  under `message` — but the header itself only prints if something
     *  actually logs, so a check that found nothing stays silent. */
    scope(message: string): Log {
        return new Log(
            this.run.failOnBad,
            {},
            this.run,
            this.depth + 1,
            this,
            message,
        );
    }

    /** One level deeper with no header, for detail under a message. */
    indent(): Log {
        return this.deeper();
    }

    say(message: string): Log {
        return this.emit('note', message);
    }

    /** Work that has started and whose result comes on a later line. */
    pending(message: string): Log {
        return this.emit('pending', message);
    }

    good(message: string): Log {
        return this.emit('good', message);
    }

    warning(message: string): Log {
        return this.emit('warning', message);
    }

    bad(message: string): Log {
        this.run.badCount++;
        const child = this.emit('bad', message);
        if (this.run.failOnBad) this.run.exit(1);
        return child;
    }

    /** Report a fatal problem and end the run. Counted like any other error. */
    exit(message: string): never {
        this.run.badCount++;
        this.emit('bad', message);
        return this.run.exit(1);
    }
}

/** A logger that gathers its lines instead of printing them, with color off —
 *  the seam unit tests assert against. */
export function collectingLog(
    failOnBad = false,
    options: LogOptions = {},
): { log: Log; lines: string[] } {
    const lines: string[] = [];
    return {
        log: new Log(failOnBad, {
            color: false,
            ...options,
            sink: (line) => lines.push(line),
        }),
        lines,
    };
}
