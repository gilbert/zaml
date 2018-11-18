import {
  Pos,
  Schema,
  ZamlError,
  brackets,
  whitespace,
  reservedOps,
  trailingSpaces
} from '../lib/util'

type Statement = {
  pos: Pos
  type: 'pre-statement'
  name: string
  args: string
  argsPos: [Pos,Pos]
  block?: Statement[]
}

type ParseResult = any

export type ParseOptions = {
  /** Variables to make available for interpolation within Zaml source code. */
  vars?: Record<string,string>,
  /** If set to true, parsing will fail when a user tries to use a variable that does not exist. */
  failOnUndefinedVars?: boolean,
}

export function lex (source: string, pos: Pos, inBlock=false): Statement[] {
  var results: Statement[] = []

  while (pos.i < source.length) {
    let i = pos.i
    let c = source[i]
    console.log("x", pos.i, `[${source[pos.i] === '\n' ? '\\n' : source[pos.i]}]`, inBlock?'BLOCK':'')

    if (c === '}') {
      if (! inBlock) {
        throw new ZamlError('syntax-error', pos, `Unexpected }`)
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
      throw new ZamlError('syntax-error', pos, `Character ${c} is reserved for key names`)
    }

    // Whitelist errors
    if (brackets.test(c)) {
      throw new ZamlError('syntax-error', pos, `Unexpected ${c}`)
    }

    // Special character escapes
    if (c === '\\' && source[pos.i+1] === '$') {
      // Skip ahead one char, effectively removing the backslash from the key name.
      pos.newcol()
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

    let hasBlock = source[argsPosEnd.i-1] === '{'
    if (hasBlock) {
      // Backtrack
      argsPosEnd.i -= 1
      argsPosEnd.col -= 1
    }

    let args = source.substring(argsPosStart.i, argsPosEnd.i).replace(trailingSpaces, '')

    let s: Statement = {
      pos: statementPos,
      type: 'pre-statement',
      name: name,
      args: args,
      argsPos: [argsPosStart, argsPosEnd],
    }
    if (hasBlock) s.block = lex(source, pos, true)

    results.push(s)
    console.log("STATEMENT COMPLETE", results[results.length-1])
  }
  return results
}

export function parseZaml (source: string, schema: Schema, statements: Statement[], opts: ParseOptions): ParseResult {
  var result: any = {}

  for (let name in schema) {
    if (schema[name].multi) {
      result[name] = []
    }
  }

  for (var i=0; i < statements.length; i++) {
    const s = statements[i]
    const name = s.name

    const t = schema[name]
    console.log("STATEMENT", name)
    if ( ! t ) {
      throw new ZamlError('user-error', s.pos, `No such config key: ${name}`)
    }

    let assign = t.multi
      ? (val: any) => { result[name].push(val) }
      : (val: any) => { result[name] = val }

    if (t.name === 'num') {
      assign(Number(withVars(s.args, s.pos, opts)))
    }
    else if (t.name === 'str') {
      assign(withVars(s.args, s.pos, opts))
    }
    else if (t.name === 'bool') {
      let val = withVars(s.args, s.pos, opts)
      if (val !== 'true' && val !== 'false') {
        throw new ZamlError('user-error', s.argsPos[0],
          `Invalid boolean: '${val}'. Value must be true or false.`)
      }
      assign(val === 'true')
    }
    else if (t.name === 'list') {
      if (s.block) {
        if (s.args.length > 0) {
          throw new ZamlError('user-error', s.argsPos[0], listFormatError)
        }

        let list = []
        for (let s2 of s.block) {
          if (t.schema) {
            let str = withVars(s2.name, s2.pos, opts)
            list.push(s2.block ? [str, parseZaml(source, t.schema, s2.block, opts)] : [str])
          }
          else if (s2.block) {
            throw new ZamlError('user-error', s2.argsPos[0], `The '${s.name}' list does not accept a block.`)
          }
          else {
            list.push(
              withVars(s2.name + (s2.args.length ? ` ${s2.args}` : ''), s2.pos, opts)
            )
          }
        }
        assign(list)
      }
      else {
        // Inline list
        console.log(`PARSING ARGS [${s.argsPos[1].i}:${source[s.argsPos[1].i]}]`)
        assign(parseArgs(source, s.argsPos[0], s.argsPos[1], opts))
      }
    }
    else if (t.name === 'kv') {
      var hash: Record<string,string> = {}
      if (s.block) {
        for (let s2 of s.block) {
          if (s2.args === '') {
            throw new ZamlError('user-error', s2.argsPos[0], `Hash key '${s2.name}' requires a value.`)
          }
          hash[ withVars(s2.name, s2.pos, opts)] = withVars(s2.args, s2.argsPos[0], opts)
        }
      }
      assign(hash)
    }
    else if (t.name === 'namespace') {
      if (! s.block) {
        console.log("???", s)
        throw new ZamlError('user-error', s.pos, `Namespace '${s.name}' requires a block.`)
      }
      assign(parseZaml(source, t.schema, s.block, opts))
    }
    else if (t.name === 'tuple') {
      // if (args.length !== t.types.length) {}
      let args = parseArgs(source, s.argsPos[0], s.argsPos[1], opts, (arg, k, pos) => {
        let t2 = t.types[k]
        //
        // No need to transform with withVars at this point since
        // parseArgs has already done so.
        //
        if (t2 === 'num') {
          return Number(arg)
        }
        else if (t2 === 'str') {
          return arg
        }
        else if (t2 === 'bool') {
          if (arg !== 'true' && arg !== 'false') {
            throw new ZamlError('user-error', pos,
              `Invalid boolean: '${arg}'. Value must be true or false.`)
          }
          return arg === 'true'
        }
        else {
          throw new ZamlError('unexpected-error', pos,
            `Invalid tuple type '${JSON.stringify(t2)}' for arg '${JSON.stringify(arg)}' (Shouldn't be possible)`)
        }
      })

      if (s.block && t.schema) {
        args.push(parseZaml(source, t.schema, s.block, opts))
      }

      assign(args)
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

function parseArgs (
  source: string,
  start: Pos,
  end: Pos,
  opts: ParseOptions,
  map: (arg: string, i: number, pos: Pos) => any = id
): string[] {
  var args: string[] = []
  var pos = start.copy()

  while (pos.i < end.i) {
    let c = source[pos.i]
    console.log("a", pos.i, `[${c}]`)

    if (pos.skipSpace(source)) continue

    // Quoted strings
    if (c === '"') {
      let start = pos.copy()
      let arg = parseQuotedString(source, pos.newcol(), end)
      args.push(map(withVars(arg, start, opts), args.length, start))
      console.log("ARG COMPLETE", arg)
    }

    // Argument complete
    else {
      let start = pos.copy()
      while (pos.i < end.i && source[pos.i] !== ' ' && source[pos.i] !== '\t') {
        pos.newcol()
      }
      let arg = source.substring(start.i, pos.i)
      args.push(map(withVars(arg, start, opts), args.length, start))
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

function withVars (str: string, origin: Pos, opts: ParseOptions) {
  if (! opts.vars) return str

  return str.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, varName) => {
    var val = opts.vars![varName]
    if ( ! val && opts.failOnUndefinedVars === true) {
      throw new ZamlError('user-error', origin, `Variable '$${varName}' is not defined.`)
    }
    return val || ''
  })
}

function id <T>(x: T) { return x }

const listFormatError =
  `You may provide a block or inline arguments to a list, but not both.
Examples:
  ✓ a_list x y z
  ✓ a_list {
      x
      y
      z
    }
`
