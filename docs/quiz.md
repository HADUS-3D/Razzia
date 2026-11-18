# Quiz Configuration

Quizzes live in `config/quizz/*.json`, see [Configuration](configuration.md).

Quizzes can be created in two ways:

- **Via the Quiz Editor**: use the built-in editor available in the manager dashboard (recommended)
- **Via JSON files**: manually create files in the `config/quizz/` directory

You can have multiple quiz files and select which one to use when starting a game.

Example quiz configuration (`config/quizz/example.json`):

```json
{
  "gameMode": "quiz",
  "subject": "Example Quiz",
  "questions": [
    {
      "question": "What is the correct answer?",
      "answers": ["No", "Yes", "No", "No"],
      "solutions": [1],
      "cooldown": 5,
      "time": 15
    },
    {
      "question": "Which of these are primary colors?",
      "answers": ["Red", "Green", "Blue", "Yellow"],
      "solutions": [0, 2, 3],
      "cooldown": 5,
      "time": 20
    },
    {
      "question": "What is the correct answer with an image?",
      "answers": ["No", "Yes", "No", "No"],
      "media": {
        "type": "image",
        "url": "https://placehold.co/600x400.png"
      },
      "solutions": [1],
      "cooldown": 5,
      "time": 20
    }
  ]
}
```

Quiz Options:

- `gameMode`: `"quiz"` (default) or `"survey"`, see [Survey mode](#survey-mode)
- `subject`: Title/topic of the quiz
- `questions`: Array of question objects containing:
  - `type`: `"single"` (exactly one answer), `"multi"` (one or more), `"estimation"` (a number, see [Estimation questions](#estimation-questions)) `"puzzle"` (12 words in 3 groups, see [Puzzle questions](#puzzle-questions)) or `"pin"` (tap a spot on an image or map, see [Pin questions](#pin-questions)). Defaults to `"single"` when omitted
  - `question`: The question text
  - `category`: Optional category, see [Categories](#categories)
  - `round`: Optional `{ "name": string, "background"?: url }` that starts a new round with this question, see [Rounds](#rounds)
  - `note`: Optional explanation shown on the main screen when the answer is revealed, e.g. `"Red, green and blue are the primary colors of light"`
  - `answers`: Array of possible answers (2-4 options)
  - `media`: Optional media object displayed with the question:
    - `type`: `"image"`, `"video"`, or `"audio"`
    - `url`: URL of the media, either a full `http(s)://` URL or a `/media/...` path for a file uploaded from the editor (stored in `config/media`)
  - `solutions`: Array of correct answer indices (0-based). Use multiple indices for multi-answer questions. Required in `"quiz"` mode, omitted in `"survey"` mode
  - `cooldown`: Time in seconds before answers are revealed (3-15)
  - `time`: Time in seconds allowed to answer (5-120)
  - `maxPoints`: Maximum points awarded for a correct answer (default: `1000`, min: `0`)
  - `penalty`: Points deducted for a wrong answer (default: none, min: `0`). The player's total cannot go below 0. Unanswered questions are not penalised.
  - `options.scoringMode`: For `"multi"` questions only — `"strict"` (full points only if the selection matches exactly), `"balanced"` (correct picks minus wrong ones, the default) or `"lenient"` (points per correct pick, no penalty for wrong ones)

## Estimation questions

An `"estimation"` question asks for a number instead of offering answers to pick from, e.g. "How many days does a fly live?". Players answer with a slider or by typing a number, and are scored on how close they get, not on how fast they answer:

```json
{
  "type": "estimation",
  "question": "How many days does a fly live?",
  "answers": [],
  "solutions": [28],
  "options": {
    "inputMode": "slider",
    "min": 0,
    "max": 60,
    "step": 1,
    "margin": 5
  },
  "cooldown": 5,
  "time": 30
}
```

- `answers`: Always an empty array
- `solutions`: A one-element array holding the expected value, between `min` and `max`. Required in `"quiz"` mode, omitted in `"survey"` mode
- `options.inputMode`: `"slider"` (pick a value between the bounds) or `"input"` (type a number between the bounds)
- `options.min` / `options.max`: Bounds of the accepted values, `max` must be greater than `min`
- `options.step`: Precision of the slider (must be greater than 0)
- `options.margin`: How far from the expected value an answer still counts as correct. An exact answer earns `maxPoints`, an answer at the edge of the margin earns half of it, and anything further away earns nothing (and the `penalty`, if any). A margin of `0` only accepts the exact value

## Puzzle questions

A `"puzzle"` question, inspired by De Slimste Mens ter Wereld, shows 12 words that form 3 groups of 4. Every group has a connection, e.g. "Planets" for Mars, Venus, Saturn and Mercury. Players type the connection of each group as an open answer. Puzzles are only available in `"quiz"` mode:

```json
{
  "type": "puzzle",
  "question": "What do the words in each group have in common?",
  "answers": [
    "Mars",
    "Venus",
    "Saturn",
    "Mercury",
    "Nile",
    "Amazon",
    "Danube",
    "Rhine",
    "Hamlet",
    "Macbeth",
    "Othello",
    "Tempest"
  ],
  "options": {
    "connections": [
      ["Planets", "The planets"],
      ["Rivers"],
      ["Shakespeare plays", "Shakespeare"]
    ]
  },
  "cooldown": 5,
  "time": 60
}
```

- `answers`: Exactly 12 words. Words 1-4 are group 1, words 5-8 group 2 and words 9-12 group 3. Players see the words shuffled
- `options.connections`: Three arrays, one per group, with every answer that is accepted for that group. The first is shown as the solution. `solutions` is not used
- Capitals, accents and extra spaces are ignored when answers are checked. Typos are **not** forgiven, so list spelling variants as accepted answers
- Points do not depend on speed. Every group found earns an equal share of `maxPoints` (a third each, so all three groups earn `maxPoints`). A question counts as answered correctly, for the streak and the `penalty`, when at least one group is found

## Pin questions

A `"pin"` question asks players to tap a spot, either on an image (a map picture, a floor plan, a photo) or on a real OpenStreetMap map. When time is up the big screen shows every player's pin at once, then reveals the right spot and lists each player's distance. Points depend on the distance only, never on speed. Pin questions are only available in `"quiz"` mode.

On an image (`options.mode` omitted or `"image"`):

```json
{
  "type": "pin",
  "question": "Where is Paris?",
  "answers": [],
  "media": { "type": "image", "url": "/media/europe.png" },
  "options": {
    "x": 38,
    "y": 62,
    "radius": 3,
    "maxDistance": 40,
    "aspect": 1.5,
    "imageWidth": 4000,
    "unit": "km"
  },
  "cooldown": 5,
  "time": 30
}
```

- `media`: Required, an image. It is the field players tap
- `options.x` / `options.y`: The right spot as percentages (0-100) of the image width and height, from the top left
- `options.radius` / `options.maxDistance`: Distances in percent of the image width. A pin within `radius` earns the full `maxPoints`, a pin at `maxDistance` or further earns nothing, in between the points fall in a straight line. `maxDistance` must be greater than `radius`
- `options.aspect`: Width divided by height of the image (default `1`). The editor fills it in, set it when you write the file by hand, as the distances need it
- `options.imageWidth` / `options.unit`: Optional. How wide the image is in real life, e.g. `4000` and `"km"`, to show distances as "412 km" instead of a percentage

On a real map (`options.mode` is `"map"`), no `media` is needed:

```json
{
  "type": "pin",
  "question": "Where is Amsterdam?",
  "answers": [],
  "options": {
    "mode": "map",
    "x": 4.9,
    "y": 52.37,
    "radius": 25,
    "maxDistance": 1500,
    "view": { "lat": 50, "lng": 10, "zoom": 4 }
  },
  "cooldown": 5,
  "time": 30
}
```

- `options.x` / `options.y`: The right spot as longitude and latitude
- `options.radius` / `options.maxDistance`: Distances in km over the earth's surface, scored the same way as on an image
- `options.view`: Where the players' map starts (`lat`, `lng` and `zoom` 0-18). The editor stores the map as you leave it
- The map tiles come from `tile.openstreetmap.org`, so the host's and the players' devices need internet access. Mind the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) for heavy use

A question counts as answered correctly, for the streak and the `penalty`, when the pin is closer than `maxDistance`. The right spot stays on the server until the answer is revealed.

## Rounds

Put `round` on the first question of each round to play the quiz in rounds:

```json
{ "question": "What is Canada's capital?", "round": { "name": "Geography", "background": "/media/map.png" }, ... },
{ "question": "What is the longest river?", ... },
{ "question": "Who sang Thriller?", "round": { "name": "Music" }, ... }
```

- A round runs from the question that carries `round` up to the next question that carries one
- The round opens with a title slide with its name (and the round number), on its own `background` (a `/media/...` path or an `http(s)://` URL). Without one it falls back to the quiz background, then to the app background
- When a round is over, the host sees the **full** leaderboard (not just the top 5) with an animated score movement, and a flame with each player's **longest streak of right answers so far in the whole quiz**
- The last round has no leaderboard of its own: the quiz goes straight to the podium
- Questions are not required to belong to a round. A quiz without any `round` plays as one long quiz, as before, and there is no title slide: the quiz name is shown in the lobby and on the screen where players enter their name
- Rounds work together with [categories](#categories): the leaderboard is still shown or skipped by category inside a round, and always shown at the end of a round
- In `"survey"` mode a round only shows its title slide; there is no leaderboard

## Categories

By default the leaderboard is shown after every question. To skip the leaderboard between a few questions, give consecutive questions the same `category`: the leaderboard is then skipped inside the round and only shown when the category changes, with the score movement of the whole round.

```json
{ "question": "What is Canada's capital?", "category": "Geography", ... },
{ "question": "What is the longest river?", "category": "Geography", ... },
{ "question": "Who sang Thriller?", "category": "Music", ... }
```

Here the leaderboard appears once after the two geography questions, and the music question goes straight to the podium as the last one.

- Questions without a `category` keep showing the leaderboard after each question
- A round is a run of consecutive questions: a category that comes back later in the quiz starts a new round
- Categories have no effect in `"survey"` mode, which has no leaderboard

> **Note:** the app automatically adds and manages an `id` field inside each quiz file the first time it's loaded — you don't need to set it yourself, and editing it manually may cause conflicts if it collides with another quiz's id.

## Generated question rounds (Open Trivia Database)

In the quiz editor, next to "Add question", users who may create quizzes find a "Generate a round" button. The server fetches questions from the [Open Trivia Database](https://opentdb.com) and adds them to the quiz you are editing; nothing is saved until you save the quiz.

- Settings: number of questions (1 to 50), one category or any, difficulty, and multiple choice or true/false
- Multiple choice questions get their four answers in random order; true/false questions get `True` and `False`
- Each question has 20 seconds, a 5 second cooldown and the Open Trivia DB category as its `category` (so every generated category becomes its own round)
- The questions are in English. Before adding them you can keep them, or download them as a small JSON file together with an instruction for an AI tool that translates it. The instruction makes clear that the AI must deliver a JSON file (not JSON as chat text) in the same format; import that file (pasting the JSON also works as a fallback) in the same dialog to add the translated questions
- The server asks Open Trivia DB for at most one request every 5 seconds (their limit per IP), so generating can take a few seconds, and keeps a session token per user so consecutive generations do not repeat questions
- A quiz with generated questions gets `"source": "opentdb"` (kept on export and import). The podium shows the credit "Questions from Open Trivia Database (CC BY-SA 4.0)" for such quizzes

The round file used for translating only holds what is needed to import it:

```json
{
  "questions": [
    {
      "question": "Which planet is known as the Red Planet?",
      "answers": ["Venus", "Mars", "Jupiter", "Saturn"],
      "solutions": [1],
      "category": "Science & Nature"
    }
  ]
}
```

`solutions` are positions in `answers`. Type, time and cooldown are filled in with defaults on import.

The questions are provided by the Open Trivia Database under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/). Keep the attribution when you share generated quizzes.

## Survey mode

A quiz with `"gameMode": "survey"` collects opinions instead of testing knowledge: there is no scoring, no leaderboard and no podium, and no answer is correct. The host still controls the pace and still sees how the answers are distributed after each question, but players see neither points nor a rank, and the game ends on a summary screen rather than a podium.

Because a survey question has no right answer, `solutions` is left out entirely, and the scoring fields (`maxPoints`, `penalty`, `options.scoringMode`) are ignored:

```json
{
  "gameMode": "survey",
  "subject": "Sprint retro",
  "questions": [
    {
      "type": "single",
      "question": "How did this sprint feel?",
      "answers": ["Great", "Fine", "Hard", "Very hard"],
      "cooldown": 5,
      "time": 20
    },
    {
      "type": "multi",
      "question": "What slowed you down the most?",
      "answers": ["Meetings", "Unclear specs", "CI", "Reviews"],
      "cooldown": 5,
      "time": 30
    }
  ]
}
```

`type` keeps its meaning in a survey: it decides whether a player may pick several answers, not how they are scored.

The mode belongs to the quiz rather than to a single game, because whether the questions have right answers is a property of the content. Switching an existing quiz to survey mode in the editor keeps its `solutions` on file so you can switch back; they are simply never sent to the clients while the mode is `"survey"`. A quiz without `gameMode` is read as `"quiz"`, so files written before this option keep working untouched.
