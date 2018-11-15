
const brackets = /[\(\)\{\}\[\]]/
const whitespace = /[ \t\n\r]/
const reservedOps = /[\^&#@~`$]/
const trailingSpaces = /[ \t]*$/

type Statement = {
  pos: Pos
  type: 'pre-statement'
  name: string
  args: string
  argsPos: [Pos,Pos]
  block?: Statement[]
}

type ValueType
  = ({ name: '$num' }
  | { name: '$str' }
  | { name: '$kv' }
  | { name: '$list' }
  | { name: '$namespace', schema: Schema }
  ) & { multi: boolean }

type Schema = Record<string,ValueType>

type ParseResult = any

export function parse (source: string, definitions: any) {
  try {
    var schema = createSchema(definitions)
    var statements = lex(source, new Pos())
    return parseZaml(source, schema, statements)
  }
  catch (e) {
    if (e instanceof ZamlError) {
      e.addSource(source)
    }
    throw e
  }
}

function lex (source: string, pos: Pos, inBlock=false): Statement[] {
  var results: Statement[] = []

  while (pos.i < source.length) {
    let i = pos.i
    let c = source[i]
    console.log("x", pos.i, `[${source[pos.i] === '\n' ? '\\n' : source[pos.i]}]`, inBlock?'BLOCK':'')

    if (c === '}') {
      if (! inBlock) {
        throw new ZamlError('syntax-error', pos, `Unexpected {`)
      }
      console.log("BLOCK COMPLETE")
      pos.push(source)
      return results
    }

    // Handle whitespace
    if (pos.skipWhitespace(source)) {
      continue
    }

    // Comments
    if (c === '#') {
      while(pos.i < source.length && source[pos.i] !== '\n') {
        pos.newcol()
      }
      continue
    }

    // Reserve key operators
    if (reservedOps.test(c)) {
      throw new ZamlError('syntax-error', pos, `Character ${c} is reserved for config names`)
    }

    // Whitelist errors
    if (brackets.test(c)) {
      throw new ZamlError('syntax-error', pos, `Unexpected ${c}`)
    }

    //
    // Begin statement
    //
    let statementPos = pos.copy()
    let name = readWord(source, pos)
    console.log(`>>>> ${name}`, pos.i, `(from from [${c}]:${pos.i})`)
    while (pos.i < source.length && pos.skipSpace(source)) {}

    let argsPosStart = pos.copy()
    //
    // Read rest of the line
    //
    let argsPosEnd = argsPosStart
    while (pos.i < source.length) {
      let c2 = source[pos.i]
      if (c2 === '\n') {
        argsPosEnd = pos.copy()
        pos.newline(source[pos.i+1] === '\r')
        break
      }
      else {
        pos.newcol()
      }
    }
    if (pos.i === source.length) { argsPosEnd = pos.copy() }

    let args = source.substring(argsPosStart.i, argsPosEnd.i).replace(trailingSpaces, '')
    let block = args[args.length-1] === '{'
      ? lex(source, pos, true)
      : undefined

    if (block) console.log("GOT DA BLOCK", args, block)

    results.push({
      pos: statementPos,
      type: 'pre-statement',
      name: name,
      args: args,
      argsPos: [argsPosStart, argsPosEnd],
      block: block,
    })
    console.log("STATEMENT COMPLETE", results[results.length-1])
  }
  return results
}

function createSchema (definitions: any) {
  var schema: Schema = {}
  for (var key in definitions) {
    if (reservedOps.test(key[0])) {
      throw new ZamlError('author-error', null, `The key (${key}) is invalid: ${key[0]} is a reserved word.`)
    }

    // Extract key attributes
    let [configName, ...attrs] = key.split('$')
    let multi = attrs.indexOf('multi') >= 0

    // Strip attrs from key so source code matches up
    if (attrs.length) {
      definitions[configName] = definitions[key]
      delete definitions[key]
      key = configName
    }

    let t = definitions[configName]
    if (t === '$num' || t === '$str') {
      schema[key] = { name: t, multi }
    }
    else if (t === '$kv') {
      schema[key] = { name: t, multi }
    }
    else if (t === '$list') {
      schema[key] = { name: t, multi }
    }
    else if (isObj(t)) {
      schema[key] = { name: '$namespace', schema: createSchema(t), multi }
    }
    else {
      throw new ZamlError('author-error', null, `Invalid schema type: ${t}`)
    }
  }
  return schema
}


function parseZaml (source: string, schema: Schema, statements: Statement[]): ParseResult {
  var result: any = {}

  for (let name in schema) {
    if (schema[name].multi) {
      result[name] = []
    }
  }

  for (var i=0; i < statements.length; i++) {
    let s = statements[i]
    let name = s.name

    let t = schema[name]
    console.log("STATEMENT", name)
    if ( ! t ) {
      throw new ZamlError('user-error', s.pos, `No such config: ${name}`)
    }

    let assign = t.multi
      ? (val: any) => { result[name].push(val) }
      : (val: any) => { result[name] = val }

    if (t.name === '$num') {
      assign(Number(s.args))
    }
    else if (t.name === '$str') {
      assign(s.args)
    }
    else if (t.name === '$list') {
      if (s.block) {
        if (s.args.length !== 1) {
          throw new ZamlError('user-error', s.argsPos[0],
  `You may provide a block or inline arguments, but not both.
Examples:
  ✓ a_list x y z
  ✓ a_list {
      x
      y
      z
    }
  `
          )
        }

        let list = []
        for (let s2 of s.block) {
          // TODO: Support lists of complex types
          list.push(s2.name + (s2.args.length ? ` ${s2.args}` : ''))
        }
        assign(list)
      }
      else {
        console.log(`PARSING ARGS [${s.argsPos[1].i}:${source[s.argsPos[1].i]}]`)
        assign(parseArgs(source, s.argsPos[0], s.argsPos[1]))
      }
    }
    else if (t.name === '$kv') {
      var hash: Record<string,string> = {}
      if (s.block) {
        for (let s2 of s.block) {
          if (s2.args === '') {
            throw new ZamlError('user-error', s2.argsPos[0], `Hash key '${s2.name}' requires a value.`)
          }
          hash[s2.name] = s2.args
        }
      }
      assign(hash)
    }
    else if (t.name === '$namespace') {
      if (! s.block) {
        console.log("???", s)
        throw new ZamlError('user-error', s.pos, `Namespace '${s.name}' requires a block.`)
      }
      assign(parseZaml(source, t.schema, s.block))
    }
    else {
      throw new ZamlError('unexpected-error', null, "Shouldn't be possible.")
    }
  }

  return result
}

function getQuotedString (source: string, pos: Pos, end: Pos): string {
  var start = pos.copy()
  console.log("quote", pos.i, `[${source[pos.i]}]`)
  // TODO: Support backslash quotes
  while (pos.i < end.i && source[pos.i] !== '"') {
    if (pos.skipNewline(source)) {
      throw new ZamlError('syntax-error', pos, `Newlines are not allowed in quoted strings`)
    }
    pos.newcol()
    console.log(`q ${pos.i} [${source[pos.i]}]`)
  }
  if (pos.i === end.i) {
    console.log("hrm", `[${source[pos.i-1]}${source[pos.i]}:]`)
    throw new ZamlError('syntax-error', start, `Unexpected EOF: Missing end quote`)
  }
  var str = source.substring(start.i, pos.i)
  pos.newcol() // Skip end quote character
  return str
}

function parseArgs (source: string, start: Pos, end: Pos): string[] {
  var args: string[] = []
  var pos = start.copy()

  while (pos.i < end.i) {
    let c = source[pos.i]
    console.log("a", pos.i, `[${c}]`)

    if (pos.skipSpace(source)) continue

    // Quoted strings
    if (c === '"') {
      let arg = getQuotedString(source, pos.newcol(), end)
      args.push(arg)
      console.log("ARG COMPLETE", arg)
    }

    // Argument complete
    else {
      let start = pos.i
      while (pos.i < end.i && source[pos.i] !== ' ' && source[pos.i] !== '\t') {
        pos.newcol()
      }
      let arg = source.substring(start, pos.i)
      args.push(arg)
      console.log("ARG COMPLETE", arg)
    }
  }

  return args
}

function readWord (source: string, pos: Pos): string {
  var start = pos.i
  console.log("_word", pos.i, `[${source[pos.i]}]`)
  while (pos.i < source.length && ! whitespace.test(source[pos.i])) {
    pos.newcol()
  }
  return source.substring(start, pos.i)
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
  constructor(public type: ZamlErrorType, public pos: Pos | null, message: string) {
    super(`[ZamlError] ${message}`)
  }
  addSource(source: string) {
    if (! this.pos) return

    var lines = source.split('\n')
    var {line, col} = this.pos
    this.message =
      this.message + '\n' +
      `  on line ${line} col ${col}\n` +
      `    ${lines[line-1]}\n    ${ range(0,col-1).map(_ => ' ').join('') }^`
  }
}

function range (start: number, end: number) {
  var result = []
  for (var i=start; i < end; i++) result.push(i)
  return result
}

class Pos {
  constructor(public line=1, public col=1, public i=0) {}
  push(source: string) {
    this.skipNewline(source) || this.newcol()
    return this
  }
  newcol() {
    this.i += 1
    this.col += 1
    return this
  }
  newline(windowsLine=false) {
    this.i += (windowsLine ? 2 : 1)
    this.col = 1
    this.line += 1
  }
  copy() {
    return new Pos(this.line, this.col, this.i)
  }
  skipSpace(source: string): boolean {
    if (source[this.i] === ' ' || source[this.i] === '\t') {
      this.newcol()
      return true
    }
    return false
  }
  skipNewline(source: string): boolean {
    if (source[this.i] === '\n') {
      this.newline(source[this.i+1] === '\r')
      return true
    }
    return false
  }
  skipWhitespace(source: string): boolean {
    return this.skipSpace(source) || this.skipNewline(source)
  }
}
