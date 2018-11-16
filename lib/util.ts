//
// Constants
//
export const brackets = /[\(\)\{\}\[\]]/
export const whitespace = /[ \t\n\r]/
export const reservedOps = /[\^&#@~`$]/
export const trailingSpaces = /[ \t]*$/

//
// Schema defs
//
type ValueType
  = ({ name: 'num' }
  | { name: 'str' }
  | { name: 'kv' }
  | { name: 'list' }
  | { name: 'bool' }
  | { name: 'namespace', schema: Schema }
  ) & { multi: boolean }

export type Schema = Record<string,ValueType>

export const validTypes = ['num', 'str', 'kv', 'list', 'bool']

//
// Errors
//
type ZamlErrorType
  = 'syntax-error'
  | 'author-error'
  | 'user-error'
  | 'unexpected-error'

export class ZamlError extends Error {
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


//
// Helpers
//
export function isObj (x: any) {
  return Object.prototype.toString.call(x) === '[object Object]'
}

function range (start: number, end: number) {
  var result = []
  for (var i=start; i < end; i++) result.push(i)
  return result
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
