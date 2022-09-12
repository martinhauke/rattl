import axios, { AxiosResponse } from 'axios'
import parse from 'node-html-parser'
import { exit } from 'process'

type CrawledUrl = {
  url: string
  status: number
}

type UncrawledUrl = {
  url: string
  referer: string
}

const startUrl = process.argv[2]
if (startUrl === undefined) {
  console.log('Please provide a url')
  exit(1)
}

const crawledUrls: Record<string, CrawledUrl> = {}
let uncrawledUrls: Record<string, UncrawledUrl> = {
  [startUrl]: { url: startUrl, referer: startUrl },
}

const getFullUrl = (href: string) =>
  href.startsWith('/') ? startUrl + href : href

const addToUncrawledUrls = (url: string, referer: string) => {
  if (uncrawledUrls[url] || crawledUrls[url] || !url.startsWith(startUrl)) {
    return
  }
  uncrawledUrls[url] = { url, referer }
}

const createAxiosPromiseFromUrl = (url: string): Promise<AxiosResponse> => {
  return axios
    .get(url, {
      validateStatus: () => true,
    })
    .catch((e): AxiosResponse => {
      return {
        data: null,
        status: 0,
        statusText: e.message,
        headers: {},
        config: {},
      }
    })
}

const greenText = (text: string) => `\x1b[32m${text}\x1b[0m`
const redText = (text: string) => `\x1b[31m${text}\x1b[0m`

const handleResponse = (response: AxiosResponse) => {
  const url = response.config.url || ''
  if (response.status === 200) {
    console.log(greenText('url: ' + url))
  } else {
    console.log(redText('-----------------------------------'))
    console.log(redText('url: ' + url))
    console.log(redText('status: ' + response.status))
    console.log(redText('referer: ' + uncrawledUrls[url].referer))
  }
  if (response.data) {
    const content = parse(response.data)
    const links: string[] = content
      .querySelectorAll('a')
      .map((a) => getFullUrl(a.getAttribute('href') || ''))
      .filter((it) => it !== '')

    links.forEach((link) => addToUncrawledUrls(link, url))
  }
  crawledUrls[url] = {
    url: url,
    status: response.status,
  }
  delete uncrawledUrls[url]
}

const main = async () => {
  while (Object.keys(uncrawledUrls).length > 0) {
    const alreadyCrawledEntries = Object.keys(uncrawledUrls).filter(
      (it) => crawledUrls[it]
    )
    alreadyCrawledEntries.forEach((it) => delete uncrawledUrls[it])
    const nextUrls = Object.keys(uncrawledUrls)

    await axios.all(nextUrls.map(createAxiosPromiseFromUrl)).then((responses) => {
      responses.forEach(handleResponse)
    })
  }
}

main()
