import { make } from './blocks.js';
const pop = a => make('pop', { a }), set = (a, b) => make('set', { a, b }), note = a => make('note', { a });
const loop = (a, ...body) => make('while', { a, body });
export const EXAMPLES = [
  { name: 'Hello, Cob!', build: () => [note('Your first program'), pop('"Hello, Cob!"'), pop('"I was made with blocks."')] },
  { name: 'Greeter (variables)', build: () => [note('A variable is a box with a name'), set('name', '"Ada"'), pop('"Hello, " + name + "!"'), set('name', '"Grace"'), pop('"Hello, " + name + "!"')] },
  { name: 'Countdown (loop)', build: () => [set('n', '5'), loop('n > 0', pop('n'), set('n', 'n - 1')), pop('"Liftoff!"')] },
  { name: 'Times table', build: () => [set('i', '1'), loop('i <= 10', pop('"7 x " + i + " = " + 7 * i'), set('i', 'i + 1'))] },
  { name: 'Doubling', build: () => [note('How fast does doubling grow?'), set('n', '1'), loop('n < 1000', pop('n'), set('n', 'n * 2'))] },
  { name: 'Staircase', build: () => [set('stars', '"*"'), set('row', '1'), loop('row <= 5', pop('stars'), set('stars', 'stars + "*"'), set('row', 'row + 1'))] },
];
