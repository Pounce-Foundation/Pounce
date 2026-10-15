// Turns Cob's programmer-style messages into plain language. DOM-free (tested in Node).
const DESKTOP = ['This block only works in the desktop version of Cob, so it did nothing here.', 'It is safe to leave it in. Pounce just skips it in the browser.'];
const RULES = [
  [/could not load library|symbol .* not found|called before its `extern`|stub in this build|bypassed in the web sandbox/, () => DESKTOP],
  [/^malformed condition in while|^expected ':' to open while/, () => ["Cob couldn't understand the question in your while block.", 'A question compares two things, like count < 5 or name == "Ada". You can use < > <= >= == !=']],
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
  const m = /^\[cob_interp\] (syntax error|indentation error|error|warning|note)(?: at line (\d+))?: (.*)$/.exec(raw);
  if (!m) return null;
  const level = m[1] === 'warning' ? 'warn' : m[1] === 'note' ? 'note' : 'error', body = m[3];
  for (const [re, fn] of RULES) { const r = re.exec(body); if (r) { const [msg, hint] = fn(r); return { level, line: m[2] ? +m[2] : null, msg, hint, raw }; } }
  return { level, line: m[2] ? +m[2] : null, msg: 'Cob said: ' + body, hint: '', raw };
}
