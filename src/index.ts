import axios, { AxiosResponse } from 'axios'
import parse from 'node-html-parser'
import { exit } from 'process'

type CrawledPage = {
  url: string
  status: number
}

const startUrl = process.argv[2]
if (startUrl === undefined) {
  console.log('Please provide a url')
  exit(1)
}

const crawledUrls: Record<string, CrawledPage> = {}
let uncrawledUrls: string[] = [startUrl]

const getFullUrl = (href: string) =>
  href.startsWith('/') ? startUrl + href : href

const addToUncrawledUrls = (url: string) => {
  if (
    uncrawledUrls.includes(url) ||
    crawledUrls[url] ||
    !url.startsWith(startUrl)
  ) {
    return
  }
  uncrawledUrls = [...uncrawledUrls, url]
}

const createAxiosPromiseFromUrl = (url: string) => {
  return axios
    .get(url, { validateStatus: () => true })
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

const handleResponse = (response: AxiosResponse, index: number) => {
  if (response.status === 200) {
    console.log(greenText('url: ' + uncrawledUrls[index]))
  } else {
    console.log(redText('-----------------------------------'))
    console.log(redText('url:' + uncrawledUrls[index]))
    console.log(redText('status:' + response.status))
  }
  if (response.data) {
    const content = parse(response.data)
    const links: string[] = content
      .querySelectorAll('a')
      .map((a) => getFullUrl(a.getAttribute('href') || ''))
      .filter((it) => it !== '')

    links.forEach((link) => addToUncrawledUrls(link))
  }
  crawledUrls[uncrawledUrls[index]] = {
    url: uncrawledUrls[index],
    status: response.status,
  }
  uncrawledUrls = [
    ...uncrawledUrls.slice(0, index),
    ...uncrawledUrls.slice(index),
  ]
}

const main = async () => {
  while (uncrawledUrls.length > 0) {
    uncrawledUrls = uncrawledUrls.filter((it) => !crawledUrls[it])
    await axios
      .all(uncrawledUrls.map(createAxiosPromiseFromUrl))
      .then((responses) => {
        responses.forEach(handleResponse)
      })
  }
}

main()
