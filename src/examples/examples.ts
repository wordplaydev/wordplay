import Project from "../models/Project";
import Source from "../models/Source";
import WhatWord from "./WhatWord";

export type Stuff = { name: string, source: string[] };

export function makeProject(stuff: Stuff) {
    return new Project(stuff.name, new Source("main", stuff.source[0]), stuff.source.slice(1).map(s => new Source("supplement", s)))
}

export const examples: Stuff[] = [
    WhatWord,
    { name: "Listen", source: [ 
`↓🎤
Phrase(🎤 > 50 ? "🔈🔈" "🔈" 1pt × 🎤)`
    ]},
    {
        name: "Talk",
        source: [
`↓🎤
Phrase(🎤 > 50 ? "😮" "😐" 60pt + (1pt × ((🎤 > 50 ? 🎤 - 50 50) ÷ 5)))`
    ]},
    {
        name: "AnimatedFace",
        source: [
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
even: (⏱ % 2) = 0ms
Phrase(🥹{even} 32pt «Noto Sans»)
`
    ]}
];