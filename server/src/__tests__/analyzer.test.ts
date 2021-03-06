import FIXTURES, { FIXTURE_FOLDER } from '../../../testing/fixtures'
import { getMockConnection } from '../../../testing/mocks'
import Analyzer from '../analyser'
import { initializeParser } from '../parser'

let analyzer: Analyzer

const CURRENT_URI = 'dummy-uri.sh'

beforeAll(async () => {
  const parser = await initializeParser()
  analyzer = new Analyzer(parser)
})

describe('analyze', () => {
  it('returns an empty list of errors for a file with no parsing errors', () => {
    const result = analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    expect(result).toEqual([])
  })

  it('returns a list of errors for a file with a missing node', () => {
    const result = analyzer.analyze(CURRENT_URI, FIXTURES.MISSING_NODE)
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })

  it('returns a list of errors for a file with parsing errors', () => {
    const result = analyzer.analyze(CURRENT_URI, FIXTURES.PARSE_PROBLEMS)
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })
})

describe('findDefinition', () => {
  it('returns empty list if parameter is not found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findDefinition('foobar')
    expect(result).toEqual([])
  })

  it('returns a list of locations if parameter is found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findDefinition('node_version')
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })
})

describe('findReferences', () => {
  it('returns empty list if parameter is not found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findReferences('foobar')
    expect(result).toEqual([])
  })

  it('returns a list of locations if parameter is found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findReferences('node_version')
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })
})

describe('findSymbolsForFile', () => {
  it('returns empty list if uri is not found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findSymbolsForFile({ uri: 'foobar.sh' })
    expect(result).toEqual([])
  })

  it('returns a list of SymbolInformation if uri is found', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    const result = analyzer.findSymbolsForFile({ uri: CURRENT_URI })
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })

  it('issue 101', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.ISSUE101)
    const result = analyzer.findSymbolsForFile({ uri: CURRENT_URI })
    expect(result).not.toEqual([])
    expect(result).toMatchSnapshot()
  })
})

describe('wordAtPoint', () => {
  it('returns current word at a given point', () => {
    analyzer.analyze(CURRENT_URI, FIXTURES.INSTALL)
    expect(analyzer.wordAtPoint(CURRENT_URI, 25, 5)).toEqual('rm')

    // FIXME: grammar issue: else is not found
    // expect(analyzer.wordAtPoint(CURRENT_URI, 24, 5)).toEqual('else')

    expect(analyzer.wordAtPoint(CURRENT_URI, 30, 1)).toEqual(null)

    expect(analyzer.wordAtPoint(CURRENT_URI, 30, 3)).toEqual('ret')
    expect(analyzer.wordAtPoint(CURRENT_URI, 30, 4)).toEqual('ret')
    expect(analyzer.wordAtPoint(CURRENT_URI, 30, 5)).toEqual('ret')

    expect(analyzer.wordAtPoint(CURRENT_URI, 38, 5)).toEqual('configures')
  })
})

describe('findSymbolCompletions', () => {
  it('return a list of symbols across the workspace', () => {
    analyzer.analyze('install.sh', FIXTURES.INSTALL)
    analyzer.analyze('sourcing-sh', FIXTURES.SOURCING)

    expect(analyzer.findSymbolsMatchingWord({ word: 'npm_config_logl' }))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "kind": 13,
          "location": Object {
            "range": Object {
              "end": Object {
                "character": 27,
                "line": 40,
              },
              "start": Object {
                "character": 0,
                "line": 40,
              },
            },
            "uri": "dummy-uri.sh",
          },
          "name": "npm_config_loglevel",
        },
        Object {
          "kind": 13,
          "location": Object {
            "range": Object {
              "end": Object {
                "character": 31,
                "line": 48,
              },
              "start": Object {
                "character": 2,
                "line": 48,
              },
            },
            "uri": "dummy-uri.sh",
          },
          "name": "npm_config_loglevel",
        },
        Object {
          "kind": 13,
          "location": Object {
            "range": Object {
              "end": Object {
                "character": 27,
                "line": 40,
              },
              "start": Object {
                "character": 0,
                "line": 40,
              },
            },
            "uri": "install.sh",
          },
          "name": "npm_config_loglevel",
        },
        Object {
          "kind": 13,
          "location": Object {
            "range": Object {
              "end": Object {
                "character": 31,
                "line": 48,
              },
              "start": Object {
                "character": 2,
                "line": 48,
              },
            },
            "uri": "install.sh",
          },
          "name": "npm_config_loglevel",
        },
      ]
    `)

    expect(analyzer.findSymbolsMatchingWord({ word: 'xxxxxxxx' })).toMatchInlineSnapshot(
      `Array []`,
    )

    expect(analyzer.findSymbolsMatchingWord({ word: 'BLU' })).toMatchInlineSnapshot(
      `Array []`,
    )
  })
})

describe('fromRoot', () => {
  it('initializes an analyzer from a root', async () => {
    const parser = await initializeParser()

    jest.spyOn(Date, 'now').mockImplementation(() => 0)

    const connection = getMockConnection()

    const newAnalyzer = await Analyzer.fromRoot({
      connection,
      rootPath: FIXTURE_FOLDER,
      parser,
    })

    expect(newAnalyzer).toBeDefined()

    const FIXTURE_FILES_MATCHING_GLOB = 10

    // Intro, stats on glob, one file skipped due to shebang, and outro
    const LOG_LINES = FIXTURE_FILES_MATCHING_GLOB + 4

    expect(connection.console.log).toHaveBeenCalledTimes(LOG_LINES)
    expect(connection.console.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Analyzing files matching'),
    )

    expect(connection.console.log).toHaveBeenNthCalledWith(
      LOG_LINES,
      'Analyzer finished after 0 seconds',
    )
  })
})
