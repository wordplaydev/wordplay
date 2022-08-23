export const examples: Record<string, string> = {
WhatWord:
`
↓ ⌨️

•GameState(playing•? guesses•[""] secret•"")
(
    ƒ guessesRemaining() secret.length() · 2 - guesses.length()
    ƒ won() secret→[].all(ƒ(letter) guesses.has(letter))
    ƒ lost() guessesRemaining() < 0
)

words: ['kitty' 'house' 'heat' 'fart' 'townhouse' 'heatwave']

state: GameState(⊥ [] "") 
    ∆ ⌨️ 
        ⌨️.key = "Space"  ? GameState(⊤ [] 'kitty')
        ⌨️.key = "Escape" ? GameState(⊥ [] "")
        GameState(⊤ state.guesses.add(⌨️.key) state.secret)

Verse(
    state.playing ? 
        (   
            state.lost() ? Group(Vertical() [Sentence("You lost. Press space to play again.")])
            state.won() ? Group(Vertical() [Sentence("You won, nice job! Press space to play again.")])
            Group(
                Vertical()
                [
                    Sentence(state.secret→[].translate(ƒ(letter) state.guesses.has(letter) ? letter "_").join(' ') 24pt)
                    Sentence("Guesses: /state.guesses.join(' ')/" 16pt)
                    Sentence("/state.guessesRemaining()/ remaining" 12pt)
                ]
            )
        )
        Group(Vertical() [Sentence("Welcome to WhatWord!") Sentence("Press space to begin...")])
)
`,
AnimatedFace: 
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
∥: ⏱ % 2 = 0ms
Sentence(🥹{∥} 32pt «Noto Sans»)
`
};