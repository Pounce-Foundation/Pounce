import { make } from './blocks.js';
const pop = a => make('pop', { a }), set = (a, b) => make('set', { a, b }), note = a => make('note', { a });
const ask = (a, b) => make('ask', { a, b }), asknum = (a, b) => make('asknum', { a, b });
const loop = (a, ...body) => make('while', { a, body });
const recipe = (a, b, ...body) => make('recipe', { a, b, body }), serve = a => make('serve', { a }), run = (a, b) => make('run', { a, b });
const lib = (a, fn, b) => make('lib', { a, fn, b });
const iff = (a, ...body) => make('if', { a, body }), elif = (a, ...body) => make('elif', { a, body }), els = (...body) => make('else', { body });
export const EXAMPLES = [
  { name: 'Hello, Cob!', build: () => [note('Your first program'), pop('"Hello, Cob!"'), pop('"I was made with blocks."')] },
  { name: 'Greeter (variables)', build: () => [note('A variable is a box with a name'), set('name', '"Ada"'), pop('"Hello, " + name + "!"'), set('name', '"Grace"'), pop('"Hello, " + name + "!"')] },
  { name: 'Countdown (loop)', build: () => [set('n', '5'), loop('n > 0', pop('n'), set('n', 'n - 1')), pop('"Liftoff!"')] },
  { name: 'Times table', build: () => [set('i', '1'), loop('i <= 10', pop('"7 x " + i + " = " + 7 * i'), set('i', 'i + 1'))] },
  { name: 'Doubling', build: () => [note('How fast does doubling grow?'), set('n', '1'), loop('n < 1000', pop('n'), set('n', 'n * 2'))] },
  { name: 'Big or small (if / else)', build: () => [note('An if block only runs when its question is true'), set('n', '7'), iff('n > 5', pop('"big"')), els(pop('"small"')), note('Try changing n to 2')] },
  { name: 'Report card (else if)', build: () => [note('Blocks are checked from the top. The first true one runs.'), set('score', '85'), iff('score >= 90', pop('"Grade: A"')), elif('score >= 80', pop('"Grade: B"')), elif('score >= 70', pop('"Grade: C"')), els(pop('"Keep practicing!"'))] },
  { name: 'Countdown with a twist', build: () => [set('n', '5'), loop('n > 0', iff('n == 1', pop('"Last one!"')), els(pop('n')), set('n', 'n - 1')), pop('"Liftoff!"')] },
  { name: 'Say hello (ask a question)', build: () => [note('ask blocks wait for you to type an answer in the Console'), ask('name', '"What is your name? "'), pop('"Hello, " + name + "!"')] },
  { name: 'Add two numbers (ask)', build: () => [note('Use the number version when you want to do math with the answer'), asknum('a', '"First number? "'), asknum('b', '"Second number? "'), set('total', 'a + b'), pop('"Total: " + total')] },
  { name: 'Guess my number (ask + if)', build: () => [note('You get three tries'), set('secret', '7'), set('tries', '0'),
    loop('tries < 3', asknum('guess', '"Guess my number (1 to 10): "'), iff('guess == secret', pop('"You got it!"'), set('tries', '99')), elif('guess < secret', pop('"Too low"')), els(pop('"Too high"')), set('tries', 'tries + 1'))] },
  { name: 'Make your own block (recipe)', build: () => [note('A recipe is a set of blocks you name once and use again and again'),
    recipe('add', 'a, b', serve('a + b')), recipe('greet', 'name', pop('"Hello, " + name + "!"')),
    set('total', 'add(2, 3)'), pop('"2 + 3 = " + total'), run('greet', '"Ada"'), run('greet', '"Grace"')] },
  { name: 'A recipe that calls itself', build: () => [note('Factorial: 5! = 5 x 4 x 3 x 2 x 1. The if block is how it knows when to stop.'),
    recipe('fact', 'n', iff('n <= 1', serve('1')), serve('n * fact(n - 1)')),
    set('i', '1'), loop('i <= 8', pop('i + "! = " + fact(i)'), set('i', 'i + 1'))] },
  { name: 'Shout it (text library)', build: () => [note('Library blocks bring in ready-made tools. Pounce loads the right library for you.'),
    set('word', '"popcorn"'), lib('big', 'kernel_upper', 'word'), pop('big + "!"'), lib('n', 'kernel_len', 'word'), pop('word + " has " + n + " letters"'),
    lib('mix', 'kernel_replace', 'word, "o", "0"'), pop('mix')] },
  { name: 'Roll a die (math library)', build: () => [note('scatter_rand picks a random number from the first to the last, including both'),
    lib('seed', 'scatter_seed', '42'), set('i', '1'), loop('i <= 5', lib('roll', 'scatter_rand', '1, 6'), pop('"Roll " + i + ": " + roll'), set('i', 'i + 1'))] },
  { name: 'Staircase', build: () => [set('stars', '"*"'), set('row', '1'), loop('row <= 5', pop('stars'), set('stars', 'stars + "*"'), set('row', 'row + 1'))] },
];
