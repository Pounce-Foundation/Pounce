// Turns Cob's programmer-style messages into plain language. DOM-free (tested in Node).
const DESKTOP = ['This block only works in the desktop version of Cob, so it did nothing here.', 'It is safe to leave it in. Pounce just skips it in the browser.'];
const RULES = [
  [/could not load library|symbol .* not found|called before its `extern`|stub in this build|bypassed in the web sandbox/, () => DESKTOP],
  [/^malformed condition in while|^expected ':' to open while/, () => ["Cob couldn't understand the question in your while block.", 'A question compares two things, like count < 5 or name == "Ada". You can use < > <= >= == !=']],
  [/^(?:malformed condition in|expected ':' to open) (if|elif)\b/, m => [`Cob couldn't understand the question in your ${m[1] === 'elif' ? 'else if' : 'if'} block.`, 'A question compares two things, like age >= 18 or name == "Ada". You can use < > <= >= == !=']],
  [/^'(else|elif)' without a matching 'if'/, m => [`An ${m[1] === 'elif' ? 'else if' : 'else'} block is in the wrong place.`, 'It must sit directly under an if block (or an else if block), lined up with it. Each if can have only one else, and it goes last.']],
  [/^unrecognized statement: (if|elif|else)\b/, () => ['This version of Cob is too old to know if blocks.', 'Pounce needs Cob 0.0.7 or newer for if, else if and else. Rebuild Pounce against a newer Cob (see COB_REF).']],
  [/^porch_ask_int\(\) got non-numeric input "(.*)"; treated as 0/, m => [`You typed "${m[1]}", but this question needs a number, so Cob used 0.`, 'Type digits only, like 12 or 250. Use the text version (porch_ask) if words are OK.']],
  // recipes (Cob 0.0.9)
  [/^'serve' can only be used inside a recipe/, () => ['A serve block only works inside a recipe block.', 'Drag it into the recipe it belongs to.']],
  [/^a recipe can only be defined at the top level/, () => ['A recipe block must sit at the top, not inside another block.', 'Drag it out so it is not inside a while, if or recipe block.']],
  [/^recipe (\S+) needs an indented body/, m => [`The recipe "${m[1]}" has nothing inside it.`, 'Drag at least one block into it.']],
  [/recipe '(.*)' takes (\d+) arguments? but (\d+) (?:was|were) given/, m => [`The recipe "${m[1]}" needs ${m[2]} input${m[2] === '1' ? '' : 's'}, but you gave it ${m[3]}.`, `Count the inputs in the recipe block, and the values in the block that runs it. They must match.`]],
  [/recipe '(.*)' is already defined/, m => [`Two recipes are both called "${m[1]}".`, 'Give each recipe its own name.']],
  [/call to '(.*)', which is not a recipe or a library function/, m => [`Cob doesn't know a recipe called "${m[1]}".`, 'Check the spelling, and make sure there is a recipe block with exactly that name.']],
  [/'(.*)' is not defined -- it is in the standard library: add `shuck (\w+)`/, m => [`"${m[1]}" comes from the ${m[2]} library, which this program didn't load.`, `Add a shuck block with ${m[2]} in it. (Library blocks do this for you.)`]],
  [/'(.*)' is now (\w+)\(\) in the standard library/, m => [`"${m[1]}" has a new name in this version of Cob: ${m[2]}.`, 'Use the ask blocks and the library blocks, which already use the new names.']],
  [/nested more than (\d+) calls deep/, m => [`A recipe kept calling itself more than ${m[1]} times, so Cob stopped it.`, 'A recipe that calls itself needs a way to stop, like an if block that serves a value when a number reaches 0 or 1.']],
  [/clashes with an extern of the same name/, () => ['A recipe has the same name as an extern.', 'Rename the recipe.']],
  [/can only be defined at the top|expected a name after 'recipe'|after recipe |expected ':' at the end of the recipe line|parameters? (?:name )?(?:of|in) recipe|has two parameters named/, () => ["The recipe block isn't filled in correctly.", 'Give it a one-word name, and list its inputs as one-word names separated by commas, like a, b.']],
  [/bad expression after 'serve'|unexpected text after the serve expression/, () => ["Cob couldn't understand the value in your serve block.", 'Use a number, words in quotes, or math like a + b.']],
  [/malformed call|unexpected text after the call/, () => ["Cob couldn't understand a recipe call.", 'Write the recipe name, then its values in brackets, like greet("Ada") or add(2, 3).']],
  [/^malformed expression in pop/, () => ["Cob couldn't understand what is inside pop( ).", 'Put words in quotes ("Hi") and join things with +, like "Score: " + score.']],
  [/^malformed expression in set/, () => ["Cob couldn't understand the value in your set block.", 'Use a number like 5, words in quotes like "Ada", or math like score + 1.']],
  [/^expected '=' in set/, () => ['A set block needs a name and then a value.', 'Names are one word with no spaces, like score or my_score.']],
  [/^expected a variable name after 'set'/, () => ["The name box in a set block is empty or has a character Cob can't use.", 'Try a one-word name like score.']],
  [/after pop|close pop\(/, () => ['The brackets in a pop( ) block do not match.', 'Look for an extra or missing ( or ) in the box.']],
  [/after trash|close trash\(|name in trash\(\)/, () => ['The trash block needs the name of a variable.', 'Use the same name you used in harvest.']],
  [/^trash\(\) on undefined variable '(.*)'/, m => [`trash was used on "${m[1]}", which does not exist.`, 'Make it with a harvest block first.']],
  [/^unrecognized statement: (.*)/, m => [`Cob doesn't know the instruction "${m[1]}".`, 'Pounce blocks write the instructions for you, so check the boxes for typos.']],
  [/library name after 'shuck'/, () => ['The shuck block needs a module name.', 'Type the name of a module you added, like greeter.']],
  [/circular shuck detected for '(.*)'/, m => [`The module "${m[1]}" ends up including itself.`, 'Check which modules shuck each other.']],
  [/shuck nesting too deep/, () => ['Modules are nested too deeply.', 'Try having fewer modules shuck other modules.']],
  [/extern/, () => ["The extern block isn't filled in correctly.", 'It needs a function name, its inputs and a library file. Externs only work on the desktop version anyway.']],
  [/^undefined variable '(.*)', treated as 0/, m => [`You used "${m[1]}" before giving it a value, so Cob used 0.`, `Check the spelling, or add a set block above it, like: set ${m[1]} = 0`]],
  [/division by zero/, () => ["You divided by zero, which Cob can't do, so it used 0.", 'Check the number you are dividing by.']],
  [/comparing a number to a string/, () => ['You compared a number with words, so the answer is always "no".', 'Numbers have no quotes (5). Words do ("5" is words, not a number).']],
  [/while loop hit the .* safety cap/, () => ['Your loop ran ten million times, so Cob stopped it.', 'Put a block inside the while that changes something, like set count = count + 1, so the question eventually becomes false.']],
  [/harvest\(\) (needs a number|with negative)/, () => ['harvest needs a positive number of bytes.', 'Try a number like 1024.']],
  [/--no-gc/, () => ['This program uses harvest or trash, which need a special mode.', 'Pounce normally turns that on for you. Try running again.']],
  [/tabs are not allowed/, () => ['A tab character got into the code.', 'Pounce uses spaces. Remove any tab characters from your boxes.']],
];
// -> null if the line isn't a Cob diagnostic, else { level, line, msg, hint, raw }
export function explain(raw, fromStderr = true) {
  if (/COB Warning/i.test(raw)) return { level: 'warn', line: null, msg: DESKTOP[0], hint: DESKTOP[1], raw };
  if (!fromStderr) return null;
  // "[cob_interp] ..." from the interpreter itself, "[porch] ..." / "[pantry] ..." / ... from a standard library module
  const m = /^\[(?:cob_interp|[a-z_]+)\] (syntax error|indentation error|error|warning|note)(?: at line (\d+))?: (.*)$/.exec(raw);
  if (!m) return null;
  const level = m[1] === 'warning' ? 'warn' : m[1] === 'note' ? 'note' : 'error', body = m[3];
  for (const [re, fn] of RULES) { const r = re.exec(body); if (r) { const [msg, hint] = fn(r); return { level, line: m[2] ? +m[2] : null, msg, hint, raw }; } }
  return { level, line: m[2] ? +m[2] : null, msg: 'Cob said: ' + body, hint: '', raw };
}
