
var source = `
  section
  {
    title Cool Stuff
    repo https://github.com/aaa/bbb {
      show false
    }
    repo https://github.com/ccc/ddd
    repo https://github.com/eee/fff
  }
`

const brackets = /[\(\)\{\}\[\]]/
const whitespace = /[ \t\n\r]/
const reservedOps = /[\^&#@~`]/
const whitespaceOrBracket = /[ \t\n\r{]/

type State
  = { mode: 'neutral' }
  | { mode: 'block' }
  | { mode: 'statement', name: string, args: Arg[] }
  | { mode: 'end-statement' }
  | { mode: 'seeking-newline' }

const NEUTRAL: State = { mode: 'neutral' }
const BLOCK: State = { mode: 'block' }
const SEEKING_NEWLINE: State = { mode: 'seeking-newline' }
const END_STATEMENT: State = { mode: 'end-statement' }

type Arg = number | string | Statement
type Statement = { name: string, args: Arg[], block?: Statement[] }

type ParseError
  = { type: 'syntax-error', reason: string, i: number }

function parse (initialState: State, start: number): [Statement[], number] {
  var state = NEUTRAL
  var results: Statement[] = []

  for (let i=start; i < source.length; i++) {
    let c = source[i]
    console.log("i", i, `[${source[i] === '\n' ? '\\n' : source[i]}]`, state.mode, `(original ${initialState.mode})`)

    if (c === '}' && initialState.mode === 'block') {
      console.log("END BLOCK", results)
      return [results, i+1]
    }

    if (c === '{' && state.mode === 'end-statement') {
      // We have a block after all!
      // Revert state back to action mode.
      console.log("REVERT")
      var last = results.pop()
      if (! last) {
        throw new Error(`AssertionError: No statement on end-statement`)
      }
      if (last.block) {
        throw new Error(`AssertionError: Last statement on end-statement should not have a block`)
      }
      state = { mode: 'statement', ...last }
    }

    if (state.mode === 'neutral' || state.mode === 'block' || state.mode === 'end-statement') {
      // Ignore whitespace
      if (whitespace.test(c)) continue;

      // Reserve key operators
      if (reservedOps.test(c)) {
        throw { type: 'syntax-error', reason: `Character ${c} is a reserved word`, i }
      }

      // Whitelist errors
      if (brackets.test(c)) {
        throw { type: 'syntax-error', reason: `Unexpected ${c}`, i }
      }

      // >>Here is where you would add new syntactic features<<

      // Begin statement
      let [name, newIndex] = getWordUntil(whitespace, source, i)
      console.log(`>>>> ${name}`, newIndex, `(from from [${c}]:${i})`)
      i = newIndex-1
      state = { mode: 'statement', name, args: [] }
    }
    else if (state.mode === 'statement') {

      // Statement complete
      if (
        (c === '\r' && source[i+1] === '\n') ||
        (c === '\n')
      ) {
        results.push({ name: state.name, args: state.args })
        console.log("STATEMENT COMPLETE", results[results.length-1])
        state = END_STATEMENT
      }
      else if (c === '}' && initialState.mode === 'block') {
        results.push({ name: state.name, args: state.args })
        state = initialState
      }

      // Parse block argument
      else if (c === '{') {
        let [subResults, newIndex] = parse(BLOCK, i+1)
        i = newIndex-1

        results.push({ name: state.name, args: state.args, block: subResults })

        // Blocks must be followed by a newline
        state = SEEKING_NEWLINE
      }

      // Whitelist errors
      else if (brackets.test(c)) {
        throw { type: 'syntax-error', reason: `Unexpected ${c}`, i }
      }

      // Ignore whitespace
      else if (c === ' ') {
        continue
      }

      // Argument complete
      else if (c !== ' ') {
        // i = skip(/ /, source, i)
        let [arg, newIndex] = getWordUntil(whitespaceOrBracket, source, i)
        i = newIndex-1
        console.log("ARG COMPLETE", arg)
        state.args.push(arg)
      }
    }
    else if (state.mode === 'seeking-newline') {

      // Found one!
      if (
        (c === '\r' && source[i+1] === '\n') ||
        (c === '\n')
      ) {
        state = initialState
      }

      // Ignore whitespace
      else if (whitespace.test(c)) {
        continue
      }
      else {
        throw { type: 'syntax-error', reason: `Expected newline but got ${c}`, i }
      }
    }
  }

  return [results, source.length]
}

function getWordUntil (r: RegExp, content: string, start: number): [string,number] {
  var end = start
  console.log("yo_", end, content.length, `[${content[end]}]`, ! r.test(content[end]))
  while (end < content.length && ! r.test(content[end])) {
    end += 1
  }
  return [content.substring(start, end), end]
}

function skip (r: RegExp, content: string, start: number) {
  var end = start
  console.log("yo?", end, content.length, `[${content[end]}]`)
  while (end < content.length && r.test(content[end])) {
    end += 1
  }
  return end
}

try {
  console.log("GOT", parse(NEUTRAL, 0))
}
catch (err) {
  if ( isParseError(err)) {
    var lines = source.substring(0,err.i+1).split('\n')
    var line = lines[lines.length-1]
    var col = line.length
    console.log("ERROR", err.reason, `\n  on line ${lines.length} col ${col}`)
    console.log(`    ${line}\n    ${ new Array(col-1).fill(' ').join('') }^`)
  }
  else throw err
}

function isParseError (e: any): e is ParseError {
  return e.type === 'syntax-error'
}
