export const examples: Record<string, string> = {
WhatWord:
`
↓ ⌨️

•Game(guesses•[""] secret•"")
(
    ƒ guessesRemaining() (secret.length() · 2) - guesses.length()
    ƒ status()  secret = "" ? "start"
                guessesRemaining() ≤ 0 ? "lost"
                secret→[].all(ƒ(letter) guesses.has(letter)) ? "won"
                "playing"
)

words: ['kitty' 'house' 'heat' 'farm' 'townhouse' 'heatwave']

state: Game([] "")
    ∆ ⌨️ 
        ⌨️.key = "Escape" ?
            Game([] "")
        (state.status() ≠ "playing") ∧ (⌨️.key = " ") ∧ ⌨️.down ? 
            Game([] words.random())
        (state.status() = "playing") ∧ ⌨️.down ∧ (⌨️.key.length() = 1) ∧  ¬ state.guesses.has(⌨️.key) ? 
            Game(state.guesses.add(⌨️.key) state.secret)
            Game(state.guesses state.secret)

status: state.status()
board: Sentence(state.secret→[].translate(ƒ(letter) ((status = "lost") ∨ state.guesses.has(letter)) ? letter "_").join(' ') 24pt)
content: status = "start"   ?   [ Sentence("Welcome to WhatWord!" 30pt) Sentence("Press space to begin") Sentence("Type letters to guess") ]
         status = "lost"    ?   [ board Sentence("You lost. Press space to play again.") ]
         status = "won"     ?   [ board Sentence("You won, nice job! Press space to play again.") ]
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