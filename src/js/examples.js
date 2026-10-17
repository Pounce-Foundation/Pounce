import { make } from './blocks.js';
const pop = a => make('pop', { a }), set = (a, b) => make('set', { a, b }), note = a => make('note', { a });
const loop = (a, ...body) => make('while', { a, body });
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
  { name: 'Staircase', build: () => [set('stars', '"*"'), set('row', '1'), loop('row <= 5', pop('stars'), set('stars', 'stars + "*"'), set('row', 'row + 1'))] },
];
