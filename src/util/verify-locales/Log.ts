import chalk from 'chalk';

// Initialize chalk's 16 color support.
chalk.level = 1;

// A helper class to gather messages for later printing, to overcome parallel validation of locales.
export default class Log {
    private readonly messages: string[] = [];
    constructor() {}

    add(message: string) {
        this.messages.push(message);
        this.flush();
    }

    say(level: number, message: string) {
        this.add('  '.repeat(level) + message);
    }

    good(level: number, message: string) {
        this.say(level, '✓ ' + chalk.blue(message));
    }

    bad(level: number, message: string) {
        this.say(level, 'x ' + chalk.magenta(message));
    }

    exit(level: number, message: string) {
        this.bad(level, 'x ' + chalk.red(message));
        process.exit(0);
    }

    flush() {
        for (const message of this.messages) console.log(message);
        this.messages.splice(0, this.messages.length);
    }
}
