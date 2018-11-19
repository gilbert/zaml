(function() {

  var examples = [
    {
      id: 'todo-list',
      name: 'Todo List',
      schema: 'task|multi:{name,meta:kv}',
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
      name: 'Package.json example',
      schema:
`name, version, description,
main, author, license,
scripts:kv,
keywords:list,
devDependencies:kv`,
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

  var appState = {
    schema: examples[0].schema,
    source: examples[0].source,
    schemaOutput: '',
    sourceOutput: '',
  }

  window.Editor = {
    oncreate(vnode) {
      this.schemaEditor = ace.edit("schema-editor")
      this.sourceEditor = ace.edit("source-editor")

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
        compile()
      })
      this.sourceEditor.session.on('change', () => {
        appState.source = this.sourceEditor.getValue()
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
            onchange: (e) => {
              var id = e.target.value
              var ex = examples.find(ex => ex.id === id)
              this.schemaEditor.setValue(ex.schema, -1)
              this.sourceEditor.setValue(ex.source, -1)
              compile(true)
            }
          }, examples.map(ex =>
            m('option', { value: ex.id }, ex.name)
          )),
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
      m.redraw()
      return
    }

    appState.schemaOutput = JSON.stringify(schema, null, ' ')

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
})()
