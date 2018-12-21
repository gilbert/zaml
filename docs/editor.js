(function() {

  var examples = [
    {
      id: 'todo-list',
      name: 'Todo List',
      schema: '{ task|multi:{name,meta:kv} }',
      source:
`task {
  name Check out this editor
  meta {
    top-left The schema editor
    top-right The schema parsed result
    bottom-left The Zaml source editor
    bottom-right The final output
  }
}

task {
  name Visit Zaml's GitHub repo
  meta {
    url https://github.com/gilbert/zaml
  }
}

task {
  name Star the repo :)
}`
    },
    {
      id: 'package-json',
      name: 'package.json example',
      schema:
`{ name, version, description,
main, author, license,
scripts:kv,
keywords:list,
devDependencies:kv }`,
      source:
`name zaml
version 1.0.0
description Fast, type-checked, zero-dep configuration.
main index.js
scripts {
  start tsc --watch
  test ospec
}
keywords config parser
author Gilbert
license ISC
devDependencies {
  ospec ^3.0.1
  typescript ^3.1.6
}`,
    },
  ]

  var urlState = (function () {
    var hash = window.location.hash.substring(1) // Remove leading #
    var defaultContent = examples[0]

    if (hash.match(/^s=/)) {
      var decoded = LZString.decompressFromEncodedURIComponent(hash.replace(/^s=/, ''))
      try {
        return JSON.parse(decoded) || defaultContent
      }
      catch(err) {
        console.warn("Could not decode url state:", err, decoded)
        return defaultContent
      }
    }
    return examples.find(e => e.id === hash) || defaultContent
  })()

  var appState = {
    schema: urlState.schema,
    source: urlState.source,
    schemaOutput: '',
    sourceOutput: '',
    updateSchema: function () {},
    lastSelectedExample: urlState.id || null,
  }
  var silentChange = false

  window.Editor = {
    oncreate(vnode) {
      this.schemaEditor = ace.edit("schema-editor", { mode: 'ace/mode/zaml_schema' })
      this.sourceEditor = ace.edit("source-editor")

      // Fancy dynamic syntax highlighting!
      var ZamlMode = require("ace/mode/zaml").Mode
      var dynamicMode = new ZamlMode()
      this.sourceEditor.session.setMode(dynamicMode)

      appState.updateSchema = (schema) => {
        dynamicMode.$highlightRules.setSchema(cleanConfigKeys(schema))
        this.sourceEditor.session.bgTokenizer.start(0)
      }

      // Remove annoying shortcuts
      this.schemaEditor.commands.removeCommand('gotoline')
      this.sourceEditor.commands.removeCommand('gotoline')
      this.schemaEditor.commands.removeCommand('jumptomatching')
      this.sourceEditor.commands.removeCommand('jumptomatching')


      this.schemaEditor.session.gutterRenderer = {
        getWidth: ace_getWidth,
        getText: function(session, row) {
          return numberToLetters(row + 1)
        }
      }
      this.sourceEditor.session.gutterRenderer = {
        getWidth: ace_getWidth,
        getText: function(session, row) {
          return row + 1
        }
      }

      this.schemaEditor.session.on('change', () => {
        appState.schema = this.schemaEditor.getValue()
        if (! silentChange) {
          appState.lastSelectedExample = null
        }
        saveAppState()
        compile()
      })
      this.sourceEditor.session.on('change', () => {
        appState.source = this.sourceEditor.getValue()
        if (! silentChange) {
          appState.lastSelectedExample = null
        }
        saveAppState()
        compile()
      })

      compile(true)
    },
    view (vnode) {
      return m('.grid-container',
        m(".Header",
          m("h1",
            "Zaml ",
            m('small', "Online Editor"),
          ),
          m('select', {
            style: 'margin-top: 0.8rem',
            value: appState.lastSelectedExample,
            onchange: (e) => {
              if (appState.lastSelectedExample === null && ! confirm("Discard your changes?")) {
                e.preventDefault()
                return
              }
              if (e.target.value === 'null') {
                return
              }
              var id = e.target.value
              var ex = examples.find(ex => ex.id === id)
              appState.lastSelectedExample = id

              silentChange = true
              this.schemaEditor.setValue(ex.schema, -1)
              this.sourceEditor.setValue(ex.source, -1)
              silentChange = false
              window.history.replaceState(null, document.title, '#'+id)
              compile(true)
            }
          },
            m('option[value=null]', "-- Select an Example --"),
            examples.map(ex =>
              m('option', { value: ex.id }, ex.name)
            )
          ),
          m('.flex'),
          m('a.github-text[href=https://github.com/gilbert/zaml]', "Source "),
          m('a.github-icon.text-right[href=https://github.com/gilbert/zaml]',
            m('img[src=./img/github.png]')
          ),
        ),
        m(".Schema.pane",
          m('.pane-label', 'Schema'),
          m('#schema-editor', appState.schema),
        ),
        m(".Source.pane",
          m('.pane-label', 'Source'),
          m('#source-editor', appState.source),
        ),
        m(".Explanation.pane",
          m('.pane-label', 'Parsed Schema'),
          m('.scroller',
            m('pre.schema-output', appState.schemaOutput),
          ),
        ),
        m(".Output.pane",
          m('.pane-label', 'Output'),
          m('pre.source-output', appState.sourceOutput),
        ),
      )
    }
  }

  function saveAppState () {
    window.history.replaceState(null, document.title, `#s=${serializeAppState()}`)
  }

  function serializeAppState () {
    return window.LZString.compressToEncodedURIComponent(
      JSON.stringify({ schema: appState.schema, source: appState.source })
    )
  }

  function clean(state) {
    const clean = Object.keys(defaults()).reduce((acc, x) =>
      (x in state && state[x] !== defaults[x] && (acc[x] = state[x]), acc)
    , {})

    if (state.files && state.files.length)
      clean.files = pluck(state.files, ['name', 'content', 'compiler', 'selections'])

    if (state.links)
      clean.links = pluck(state.links, ['name', 'url', 'type', 'patches', 'selections'])

    return clean
  }

  var updateTimeout = null
  function compile (immediate) {
    clearTimeout(updateTimeout)
    if (immediate) {
      _compile()
    }
    else {
      updateTimeout = setTimeout(_compile, 400)
    }
  }

  function _compile() {
    console.log("Compile!")
    try {
      var schema = Zaml.parseSchema(appState.schema)
      console.log("Got schema", schema)
    }
    catch (schemaErr) {
      console.log("Schema error:", schemaErr)
      appState.schemaOutput = schemaErr.message
        .replace(/line ([0-9]+)/, (_,lineNo) => `line ${numberToLetters(Number(lineNo))}`)
      appState.sourceOutput = ''
      appState.updateSchema({})
      m.redraw()
      return
    }

    appState.schemaOutput = JSON.stringify(schema, null, ' ')
    appState.updateSchema(schema)

    try {
      var output = Zaml.parse(appState.source, schema)
      console.log("Got output", output)
      appState.sourceOutput = JSON.stringify(output, null, ' ')
      m.redraw()
    }
    catch (sourceErr) {
      console.log("Source error:", sourceErr)
      appState.sourceOutput = sourceErr.message
      m.redraw()
      return
    }
  }

  function cleanConfigKeys (schema) {
    if (! isObj(schema)) return schema
    var result = {}
    for (var key in schema) {
      result[key.split('|')[0]] = cleanConfigKeys(schema[key])
    }
    return result
  }

  function numberToLetters (n) {
    var result = ''
    while (n > 0) {
      var letterIndex = (n - 1) % 26
      result = String.fromCharCode(65 + letterIndex) + result
      n = Math.floor((n - letterIndex)/26)
    }
    return result
  }

  function ace_getWidth(session, lastLineNumber, config) {
    // return (lastLineNumber.toString().length-1) * config.characterWidth
    return 2 * config.characterWidth
  }

  function isObj(x) {
    return Object.prototype.toString.call(x) === '[object Object]';
  }
})()
