import {
  Pos,
  Schema,
  ZamlError,
  brackets,
  whitespace,
  reservedOps,
  trailingSpaces
} from './lib/util'

type Statement = {
  pos: Pos
  type: 'pre-statement'
  name: string
  args: string
  argsPos: [Pos,Pos]
  block?: Statement[]
}

type ParseResult = any

export function lex (source: string, pos: Pos, inBlock=false): Statement[] {
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

export function parseZaml (source: string, schema: Schema, statements: Statement[]): ParseResult {
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

    if (t.name === 'num') {
      assign(Number(s.args))
    }
    else if (t.name === 'str') {
      assign(s.args)
    }
    else if (t.name === 'list') {
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
    else if (t.name === 'kv') {
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
    else if (t.name === 'namespace') {
      if (! s.block) {
        console.log("???", s)
        throw new ZamlError('user-error', s.pos, `Namespace '${s.name}' requires a block.`)
      }
      assign(parseZaml(source, t.schema, s.block))
    }
    else {
      throw new ZamlError('unexpected-error', null, `Shouldn't be possible (${JSON.stringify(t)})`)
    }
  }

  return result
}

function parseQuotedString (source: string, pos: Pos, end: Pos): string {
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
      let arg = parseQuotedString(source, pos.newcol(), end)
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