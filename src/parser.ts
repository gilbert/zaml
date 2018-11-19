import {
  Pos,
  Schema,
  ZamlError,
  brackets,
  basicTypes,
  whitespace,
  reservedOps,
  trailingWhitespace
} from './util'

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

    if (c === '}') {
      if (! inBlock) {
        throw new ZamlError('syntax-error', pos, `Unexpected }`)
      }
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

    let args = source.substring(argsPosStart.i, argsPosEnd.i).replace(trailingWhitespace, '')

    let s: Statement = {
      pos: statementPos,
      type: 'pre-statement',
      name: name,
      args: args,
      argsPos: [argsPosStart, argsPosEnd],
    }
    if (hasBlock) {
      s.block = lex(source, pos, true)
      if (pos.i === source.length) {
        throw new ZamlError('syntax-error', pos, `Unexpected EOF: Missing end bracket '}'`)
      }
      if (source[pos.i] !== '}') {
        throw new ZamlError('syntax-error', pos,
          `Expected end bracket '}', got ${JSON.stringify(source[pos.i])} instead (shouldn't be possible?)`)
      }
      pos.newcol()
    }

    results.push(s)
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

    if ( ! t ) {
      throw new ZamlError('user-error', s.pos, `No such config key: ${name}`)
    }
    if (basicTypes.indexOf(t.name) >= 0 && s.block) {
      throw new ZamlError('user-error', s.argsPos[1], `Key '${name}' is a ${t.name}; it does not take a block.`)
    }

    let assign = t.multi
      ? (val: any) => { result[name].push(val) }
      : (val: any) => {
        if (name in result) {
          throw new ZamlError('user-error', s.pos, `Duplicate key '${name}'. This key may only be specified once.`)
        }
        result[name] = val
      }

    if (t.name === 'num') {
      let num = Number(withVars(s.args, s.pos, opts))
      if (Number.isNaN(num)) {
        throw new ZamlError('user-error', s.argsPos[0], `Invalid number: '${s.args}'`)
      }
      assign(num)
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
        // Block list
        if (s.args.length > 0) {
          throw new ZamlError('user-error', s.argsPos[0], listFormatError)
        }

        let list = []
        for (let s2 of s.block) {
          if (t.blockSchema) {
            let str = withVars(s2.name, s2.pos, opts)
            list.push(s2.block ? [str, parseZaml(source, t.blockSchema, s2.block, opts)] : [str])
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
    else if (t.name === 'block') {
      if (! s.block) {
        throw new ZamlError('user-error', s.pos, `Key '${s.name}' requires a block.`)
      }
      assign(parseZaml(source, t.blockSchema, s.block, opts))
    }
    else if (t.name === 'tuple') {
      let argCount = t.blockSchema ? t.types.length-1 : t.types.length
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

      if (args.length !== argCount) {
        let reqs = t.types.slice(0,argCount)
        throw new ZamlError('user-error', s.pos,
          `Incorrect number of arguments. Key '${s.name}' only accepts ${reqs.join(' ')}.`)
      }
      if (s.block && ! t.blockSchema) {
        throw new ZamlError('user-error', s.argsPos[1], `Key ${s.name} does not accept a block.`)
      }
      else if (s.block && t.blockSchema) {
        args.push(parseZaml(source, t.blockSchema, s.block, opts))
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
  // TODO: Support backslash quotes
  while (pos.i < end.i && source[pos.i] !== '"') {
    if (pos.skipNewline(source)) {
      throw new ZamlError('syntax-error', pos, `Newlines are not allowed in quoted strings`)
    }
    pos.newcol()
  }
  if (pos.i === end.i) {
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

    if (pos.skipSpace(source)) continue

    // Quoted strings
    if (c === '"') {
      let start = pos.copy()
      let arg = parseQuotedString(source, pos.newcol(), end)
      args.push(map(withVars(arg, start, opts), args.length, start))
    }

    // Argument complete
    else {
      let start = pos.copy()
      while (pos.i < end.i && source[pos.i] !== ' ' && source[pos.i] !== '\t') {
        pos.newcol()
      }
      let arg = source.substring(start.i, pos.i)
      args.push(map(withVars(arg, start, opts), args.length, start))
    }
  }

  return args
}

function readWord (source: string, pos: Pos): string {
  var start = pos.i
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
