//
// Constants
//
export const brackets = /[\(\)\{\}\[\]]/
export const whitespace = /[ \t\n\r]/
export const reservedOps = /[\^&#@~`]/
export const trailingWhitespace = /[ \t\n\r]*$/

type BasicType
  = { type: 'num' }
  | { type: 'str' }
  | { type: 'bool' }

export namespace Schema {
  type Common = { multi?: boolean, req?: boolean }
  type WithBlock = { block?: Block }

  type Enum  = { type: 'enum', options: string[] }
  type Hash  = { type: 'hash',  schema: Record<string,t>, req?: boolean }
  type Array = { type: 'array', schema: Record<string,t>, req?: boolean }

  type Block = Hash | Array

  export type TupleMemberType
    = BasicType
    | Enum

  export type BasicTypeT = BasicType & Common & WithBlock
  export type BlockT = Block & Common
  export type EnumT = Enum & Common
  export type KvT = { type: 'kv' } & Common
  export type ListT = { type: 'list', of: t } & Common
  export type TupleT = { type: 'tuple', schema: TupleMemberType[] } & Common & WithBlock

  export type t
    = BasicTypeT
    | BlockT
    | EnumT
    | KvT
    | ListT
    | TupleT
}


export const validTypes = ['num', 'str', 'kv', 'list', 'bool', 'enum']
export const LISTABLE_TYPES = ['str', 'num', 'enum']
export const BLOCKABLE_TYPES = ['str', 'num', 'bool', 'tuple']

export function basicTypeFromName (name: string): BasicType | null {
  if (name === 'num' || name === 'str' || name === 'bool') {
    return { type: name } as BasicType
  }
  return null
}

//
// Errors
//
type ZamlErrorType
  = 'syntax-error'
  | 'author-error'
  | 'user-error'
  | 'unexpected-error'

export class ZamlError extends Error {
  static syntax(pos: Pos, char: string, more='') {
    return new ZamlError('syntax-error', pos, `Unexpected '${char}'${more}`)
  }
  constructor(public type: ZamlErrorType, public pos: Pos | null, message: string) {
    super(`[ZamlError] ${message}`)
  }
  addSource(source: string) {
    if (! this.pos) return

    var lines = source.split('\n')
    var {line, col} = this.pos

    var lineNo = String(line)
    var prevLineNo = String(line-1)

    if (lineNo.length > prevLineNo.length) {
      prevLineNo = spacer(lineNo.length - prevLineNo.length) + prevLineNo
    }
    else if (prevLineNo.length > lineNo.length) {
      lineNo = spacer(prevLineNo.length - lineNo.length) + lineNo
    }

    this.message =
      this.message + '\n' +
      `  on line ${line} col ${col}\n\n` +
      (line > 1 ? `  ${prevLineNo}│ ${lines[line-2]}\n` : '') +
      `  ${lineNo}│ ${lines[line-1]}\n  ${ spacer(col-1 + lineNo.length+2) }^`
  }
}


//
// Helpers
//
export function isObj (x: any) {
  return Object.prototype.toString.call(x) === '[object Object]'
}

export function unexp (char: string, more='') {
  return `Unexpected ${JSON.stringify(char)}${more}`
}

function range (start: number, end: number) {
  var result = []
  for (var i=start; i < end; i++) result.push(i)
  return result
}

function spacer (length: number) {
  return range(0, length).map(_ => ' ').join('')
}

// Taken and modified from https://github.com/dmnd/dedent
export function dedent(string: string) {
  const lines = string.split("\n")
  let mindent = 0
  lines.forEach(l => {
    let m = l.match(/^(\s+)\S+/)
    if (m) {
      let indent = m[1].length
      if (!mindent) {
        // this is the first indented line
        mindent = indent
      } else {
        mindent = Math.min(mindent, indent)
      }
    }
  })

  let result = ''

  if (mindent !== null) {
    const m = mindent // appease TS
    result = lines.map(l => l[0] === " " ? l.slice(m) : l).join("\n")
  }

  return result
    // dedent eats leading and trailing whitespace too
    .trim()
    // handle escaped newlines at the end to ensure they don't get stripped too
    .replace(/\\n/g, "\n")
}

export class Pos {
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
  goto(target: Pos) {
    this.i = target.i
    this.col = target.col
    this.line = target.line
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
    if (this.i >= source.length) return false
    return this.skipSpace(source) || this.skipNewline(source)
  }
}
