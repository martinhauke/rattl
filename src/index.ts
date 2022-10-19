import { exit } from 'process'
import { crawl } from './Crawler'
import yargs from 'yargs/yargs'

type Arguments = {
  url: string
  errorsOnly?: boolean
  showExternalResources?: boolean
}

const argv: Arguments = yargs(process.argv.slice(2))
  .options({
    url: { type: 'string', demandOption: true, alias: 'u', nargs: 1 },
    errorsOnly: { type: 'boolean' },
    showExternalResources: { type: 'boolean' },
  })
  .parseSync()

const { url, errorsOnly, showExternalResources } = argv
if (url === undefined) {
  console.log('Please provide a url')
  exit(1)
}

crawl(url, errorsOnly === true, showExternalResources === true)
