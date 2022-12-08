import Project from "../models/Project";
import Source from "../models/Source";

import WhatWord from "./WhatWord.wp?raw";
import Listen from "./Listen.wp?raw";
import Talk from "./Talk.wp?raw";
import Laughing from "./Laughing.wp?raw";
import Layouts from "./Layouts.wp?raw";
import Transforms from "./Transforms.wp?raw";

export type Stuff = { name: string, sources: { name: string, code: string}[] };

export function makeProject(stuff: Stuff) {
    return new Project(stuff.name, new Source(stuff.sources[0].name, stuff.sources[0].code), stuff.sources.slice(1).map(s => new Source(s.name, s.code)))
}

function wpToStuff(text: string): Stuff {

    // Split the file by "===" lines
    const files = text.split(/(?==== .*\n)/g);

    // Split the files by header and code
    const sources = files.map(file => {
        const EOL = file.indexOf("\n") + 1;
        const header = file.substring(0, EOL);
        const name = header.replace("===", "").trim();
        const code = file.substring(EOL);
        return { name: name, code: code };
    })

    // Return stuff for display
    return {
        name: sources[0].name, 
        sources: sources
    }

}

export const examples: Stuff[] = [
    WhatWord,
    Listen,
    Talk,
    Laughing,
    Layouts,
    Transforms
].map(source => wpToStuff(source));