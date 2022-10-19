import { exit } from 'process'
import { crawl } from './Crawler'
import yargs from 'yargs/yargs'

type Arguments = {
  url: string
  limit?: number
  errorsOnly?: boolean
  showExternalResources?: boolean
}

const argv: Arguments = yargs(process.argv.slice(2))
  .options({
    url: { type: 'string', demandOption: true, alias: 'u', nargs: 1 },
    limit: { type: 'number', alias: 'l', nargs: 1 },
    errorsOnly: { type: 'boolean', alias: 'e' },
    showExternalResources: { type: 'boolean', alias: 'R' },
  })
  .parseSync()

const { url, limit, errorsOnly, showExternalResources } = argv
if (url === undefined) {
  console.log('Please provide a url')
  exit(1)
}

crawl(url, errorsOnly === true, showExternalResources === true, limit)
