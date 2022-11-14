import Project from "../models/Project";
import Source from "../models/Source";

import WhatWord from "./WhatWord.wp?raw";
import Listen from "./Listen.wp?raw";
import Talk from "./Talk.wp?raw";
import Laughing from "./Laughing.wp?raw";

export type Stuff = { name: string, source: string[] };

export function makeProject(stuff: Stuff) {
    return new Project(stuff.name, new Source("main", stuff.source[0]), stuff.source.slice(1).map(s => new Source("supplement", s)))
}

function wpToStuff(text: string): Stuff {

    // Split the file by "===" lines
    const files = text.split(/(?==== .*\n)/g);

    // Split the files by header and code
    const source = files.map(file => {
        const EOL = file.indexOf("\n") + 1;
        const header = file.substring(0, EOL);
        const name = header.replace("===", "").trim();
        const code = file.substring(EOL);
        return { name: name, code: code };
    })

    // Return stuff for display
    return {
        name: source[0].name, source: source.map(source => source.code)
    }

}

export const examples: Stuff[] = [
    WhatWord,
    Listen,
    Talk,
    Laughing
].map(source => wpToStuff(source));