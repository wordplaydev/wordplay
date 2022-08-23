export const examples: Record<string, string> = {
WhatWord:
`
↓ ⌨️

•GameState(playing•? guesses•[""] secret•""∨!)
(
    guessesRemaining: ƒ() secret.length · 2 - guesses.length
    won: ƒ() secret→[].every(ƒ(letter) guesses.has(letter))
    lost: ƒ() guessesRemaining < 0
)

words: ['kitty' 'house' 'heat' 'fart' 'townhouse' 'heatwave']

state: GameState(⊥ [] !) 
    ∆ ⌨️ 
        ⌨️.key = "Space"  ? GameState(⊤ [] words.random())
        ⌨️.key = "Escape" ? GameState(⊥ [] !)
        GameState(⊤ guesses + ⌨️.key state.secret)
    ∆ 🖱⬇️ ∧ ¬ state.playing
        GameState(⊤ [] words.random())

title: ƒ(…messages•"") Group(Vertical() 16pt messages.map(ƒ(m) Sentence(message)))

Verse(
    font: "Noto Sans"
    size: 12pt
    state.playing ? 
        (   
            state.lost() ? title("You lost. Press space to play again.")
            state.won() ? title("You won, nice job! Press space to play again.")
            Group(
                Vertical()
                Sentence(size: 24pt text: state.secret→[].every(ƒ(letter) guesses.has(letter) ? letter "_").join(' '))
                Sentence(size: 16pt "Guesses: /state.guesses.join(' ')/")
                Sentence(size: 12pt "/state.guessesRemaining()/ remaining")
            )
        )
        title("Welcome to WhatWord!" "Press space to begin...")
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