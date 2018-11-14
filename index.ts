
const newline = /(\n)|(\n\r)/
const brackets = /[\(\)\{\}\[\]]/
const separator = /(\n)|(\n\r)|[}]/
const whitespace = /[ \t\n\r]/
const reservedOps = /[\^&#@~`$]/
const trailingSpaces = / *$/
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

type Arg = string
type Statement = { name: string, args: Arg[], block?: Statement[] }

type ParseError
  = { type: 'syntax-error', reason: string, i: number }

type ValueType
  = { name: '$num' }
  | { name: '$str' }
  | { name: '$hash' }
  | { name: '$list' }
  | { name: '$block', schema: Schema }

type Schema = Record<string,ValueType>

type ParseResult = any


export async function parse (source: string, definitions: any) {
  var results = parseZaml(source, createSchema(definitions), NEUTRAL, 0)
  return results[0]
}

function createSchema (definitions: any) {
  var schema: Schema = {}
  for (var key in definitions) {
    if (reservedOps.test(key[0])) {
      throw new ZamlError('author-error', 0, `The key (${key}) is invalid: ${key[0]} is a reserved word.`)
    }
    let t = definitions[key]
    if (t === '$num' || t === '$str') {
      schema[key] = { name: t }
    }
    else if (t === '$hash') {
      // TODO: Support hash value types. Maybe
      schema[key] = { name: t }
    }
    else if (t === '$list') {
      schema[key] = { name: t }
    }
    else if (isObj(t)) {
      schema[key] = { name: '$block', schema: createSchema(t) }
    }
    else {
      throw new ZamlError('author-error', 0, `Invalid schema type: ${t}`)
    }
  }
  return schema
}


function parseZaml (source: string, schema: Schema, initialState: State, start: number): [ParseResult, number] {
  var state = NEUTRAL
  var result: ParseResult = {}

  for (let i=start; i < source.length; i++) {
    let c = source[i]
    console.log("i", i, `[${source[i] === '\n' ? '\\n' : source[i]}]`, state.mode, `(original ${initialState.mode})`)

    if (c === '}' && initialState.mode === 'block') {
      console.log("END BLOCK", result)
      return [result, i+1]
    }

    if (c === '{' && state.mode === 'end-statement') {
      // We have a block after all!
      // Revert state back to action mode.
      console.log("REVERT")
      var last = result.pop()
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
        console.log("STATEMENT COMPLETE")
        result[state.name] = executeSchema(schema, i, { name: state.name, args: state.args })
        console.log("  >", result[result.length-1])
        state = END_STATEMENT
      }
      else if (c === '}' && initialState.mode === 'block') {
        result.push({ name: state.name, args: state.args })
        state = initialState
      }

      // Parse block argument
      else if (c === '{') {
        let statementType = schema[state.name]
        if ( statementType.name === '$block' ) {
          let [subResult, newIndex] = parseZaml(source, statementType.schema, BLOCK, i+1)
          i = newIndex-1
          result[state.name] = subResult
          // result.push({ name: state.name, args: state.args, block: subResults })
        }
        else if ( statementType.name === '$hash' ) {
          let [hash, newIndex] = parseHash(source, i+1)
          i = newIndex-1
          result[state.name] = hash
        }
        else if ( statementType.name === '$list' ) {
          let [list, newIndex] = parseList(source, i+1)
          i = newIndex-1
          result[state.name] = list
        }
        else {
          throw new ZamlError('user-error', i, `Config key '${state.name}' does not take a block`)
        }
        // Blocks and hashes must be followed by a newline
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
        state.args.push(arg)
        console.log("ARG COMPLETE", arg)
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

  return [result, source.length]
}


type HashState
  = { mode: 'key' }
  | { mode: 'val', key: string }

function parseHash(source: string, start: number): [object, number] {
  var state : HashState = { mode: 'key' }
  var hash : any = {}

  for (let h=start; h < source.length; h++) {
    let c = source[h]
    console.log("h", h, `[${source[h] === '\n' ? '\\n' : source[h]}] hash`)

    if (c === '}') {
      console.log("END HASH", hash)
      return [hash, h+1]
    }

    if (state.mode === 'key') {
      // Ignore whitespace
      if (whitespace.test(c)) continue;

      // Reserve key operators
      if (reservedOps.test(c)) {
        throw { type: 'syntax-error', reason: `Character ${c} is a reserved word`, h }
      }

      // Whitelist errors
      if (brackets.test(c)) {
        throw { type: 'syntax-error', reason: `Unexpected ${c}`, h }
      }

      // Begin key
      let [key, keyEnd] = getWordUntil(whitespace, source, h)
      console.log(`===== key '${key}'`, keyEnd, `(from from [${c}]:${h})`)
      console.log("????", `[${source[keyEnd]}] [${source.substring(keyEnd-1,keyEnd+2)}]`)

      if (source[keyEnd] !== ' ') {
        throw new ZamlError('user-error', keyEnd, `Space is required after key: ${key}`)
      }
      let valStart = skip(/ /, source, keyEnd)

      if (source[valStart] === '\r' || source[valStart] === '\n') {
        throw new ZamlError('user-error', keyEnd, `Value is required after key: ${key}`)
      }

      h = valStart-1
      state = { mode: 'val', key: key }
    }
    else if (state.mode === 'val') {
      // TODO: Support multiline strings
      console.log("VALUE END")
      let [val, newIndex] = getWordUntil(separator, source, h)
      console.log(`  > "${state.key}": "${val}"`)
      hash[state.key] = val.replace(trailingSpaces, '')

      h = newIndex-1
      state = { mode: 'key' }
    }
  }

  return [hash, source.length]
}

function parseList(source: string, start: number): [string[], number] {
  var list: string[] = []
  var bracketCount = 0

  for (let k=start; k < source.length; k++) {
    let c = source[k]
    console.log("k", k, `[${source[k] === '\n' ? '\\n' : source[k]}] hash`)

    if (c === '}') {
      console.log("END LIST", list)
      return [list, k+1]
    }

    // Ignore whitespace
    if (whitespace.test(c)) continue;

    let [item, newIndex] = getWordUntil(newline, source, k)
    list.push(item)

    k = newIndex-1
  }

  return [list, source.length]
}

function executeSchema(schema: Schema, start: number, statement: Statement) {
  var t = schema[statement.name]
  if ( ! t ) {
    throw new ZamlError('user-error', start, `No such config: ${statement.name}`)
  }
  if (t.name === '$num') {
    if (statement.args.length !== 1) {
      throw new ZamlError('user-error', start, `Config key ${statement.name} takes exactly 1 number value`)
    }
    return parseInt(statement.args[0], 10)
  }
  else if (t.name === '$str') {
    return statement.args.join(' ')
  }
  else if (t.name === '$list') {
    return statement.args
  }
  else {
    throw new ZamlError('unexpected-error', start, "Shouldn't be possible.")
  }
}

function getWordUntil (r: RegExp, source: string, start: number): [string,number] {
  var end = start
  console.log("yo_", end, source.length, `[${source[end]}]`, ! r.test(source[end]))
  while (end < source.length && ! r.test(source[end])) {
    end += 1
  }
  return [source.substring(start, end), end]
}

function skip (r: RegExp, source: string, start: number) {
  var end = start
  console.log("yo?", end, source.length, `[${source[end]}]`)
  while (end < source.length && r.test(source[end])) {
    end += 1
  }
  return end
}



// var source = `
//   section
//   {
//     title Cool Stuff
//     repo https://github.com/aaa/bbb {
//       show false
//     }
//     repo https://github.com/ccc/ddd
//     repo https://github.com/eee/fff
//   }
// `
// try {
//   console.log("GOT", parse(NEUTRAL, 0))
// }
// catch (err) {
//   if ( isParseError(err)) {
//     var lines = source.substring(0,err.i+1).split('\n')
//     var line = lines[lines.length-1]
//     var col = line.length
//     console.log("ERROR", err.reason, `\n  on line ${lines.length} col ${col}`)
//     console.log(`    ${line}\n    ${ new Array(col-1).fill(' ').join('') }^`)
//   }
//   else throw err
// }

function isParseError (e: any): e is ParseError {
  return e.type === 'syntax-error'
}

function isObj (x: any) {
  return Object.prototype.toString.call(x) === '[object Object]'
}

type ZamlErrorType
  = 'syntax-error'
  | 'author-error'
  | 'user-error'
  | 'unexpected-error'

class ZamlError extends Error {
  constructor(public type: ZamlErrorType, public i: number, message: string) {
    super(`[ZamlError] ${message}`)
  }
}
