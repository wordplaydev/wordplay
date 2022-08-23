export const examples: Record<string, string> = {
WhatWord:
`
↓ ⌨️

•GameState(playing•? guesses•[""] secret•"")
(
    ƒ guessesRemaining() (secret.length() · 2) - guesses.length()
    ƒ won() secret→[].all(ƒ(letter) guesses.has(letter))
    ƒ lost() guessesRemaining() ≤ 0
)

words: ['kitty' 'house' 'heat' 'farm' 'townhouse' 'heatwave']

state: GameState(⊥ [] "")
    ∆ ⌨️ 
        state.playing ?
            (
                ⌨️.key = "Escape" ? 
                    GameState(⊥ [] "")
                ⌨️.down ?
                    GameState(⊤ state.guesses.add(⌨️.key) state.secret)
                    GameState(state.playing state.guesses state.secret)
            )
            (
                ⌨️.key = " " ?
                    GameState(⊤ [] words.random())
                    GameState(⊥ [] "") 
            )

board: Sentence(state.secret→[].translate(ƒ(letter) (state.lost() ∨ state.guesses.has(letter)) ? letter "_").join(' ') 24pt)

content: (¬state.playing)  ?  [Sentence("Welcome to WhatWord!") Sentence("Press space to begin...")]
         state.lost()   ?  [board Sentence("You lost. Press escape to start over.")]
         state.won()    ?  [board Sentence("You won, nice job! Press escape to start over.")]
                           [
                            board
                            Sentence("Guesses: \\state.guesses.join(' ')\\" 16pt)
                            Sentence("\\state.guessesRemaining()→''\\ remaining" 12pt)
                           ]

Verse(Group(Vertical() content))
`,
AnimatedFace: 
`
↓⏱
🥹: {⊤: «😀» ⊥: «😂»}
∥: ⏱ % 2 = 0ms
Sentence(🥹{∥} 32pt «Noto Sans»)
`
};