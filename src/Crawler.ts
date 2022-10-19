import axios, { AxiosResponse } from 'axios'
import parse, { HTMLElement } from 'node-html-parser'
import { writeResultToConsole } from './Output'
import { URL } from 'url'

type CrawledUrl = {
  url: string
  status: number
}

type UncrawledUrl = {
  url: string
  referer: string
}

export type ExternalResource = {
  url: string
  tagName: string
  externalUrl: string
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
        config: { url },
      }
    })
}

const getFullUrl = (href: string, baseUrl: string): string => {
  try {
    return '' + new URL(href, baseUrl)
  } catch (error) {
    console.log(
      'An error occured while trying to parse the following url:',
      href
    )
    console.log('Referer:', baseUrl)
    console.log('Error:', error)
    return ''
  }
}

export const crawl = async (
  startUrl: string,
  showErrorsOnly: boolean,
  showExternalLinks: boolean
) => {
  const crawledUrls: Record<string, CrawledUrl> = {}
  let uncrawledUrls: Record<string, UncrawledUrl> = {
    [startUrl]: { url: startUrl, referer: startUrl },
  }

  const addToUncrawledUrls = (url: string, referer: string) => {
    if (uncrawledUrls[url] || crawledUrls[url] || !url.startsWith(startUrl)) {
      return
    }
    uncrawledUrls[url] = { url, referer }
  }

  const handleResponse = (response: AxiosResponse) => {
    const url = response.config.url || ''

    if (response.data) {
      const content = parse(response.data)
      const externalResources = showExternalLinks
        ? findExternalResources(content, startUrl, url)
        : undefined
      const links: string[] = content
        .querySelectorAll('a')
        .map((a) => getFullUrl(a.getAttribute('href') || '', url))
        .filter((it) => it !== '')

      links.forEach((link) => addToUncrawledUrls(link, url))

      writeResultToConsole(
        url,
        uncrawledUrls[url]?.referer,
        response,
        showErrorsOnly,
        externalResources
      )
    } else {
      writeResultToConsole(
        url,
        uncrawledUrls[url]?.referer,
        response,
        showErrorsOnly
      )
    }

    crawledUrls[url] = {
      url: url,
      status: response.status,
    }

    delete uncrawledUrls[url]
  }

  while (Object.keys(uncrawledUrls).length > 0) {
    const alreadyCrawledEntries = Object.keys(uncrawledUrls).filter(
      (it) => crawledUrls[it]
    )
    alreadyCrawledEntries.forEach((it) => delete uncrawledUrls[it])
    const nextUrls = Object.keys(uncrawledUrls)

    await axios
      .all(nextUrls.map(createAxiosPromiseFromUrl))
      .then((responses) => {
        responses.forEach(handleResponse)
      })
  }
}

const findExternalResources = (
  content: HTMLElement,
  startUrl: string,
  url: string
): ExternalResource[] => {
  const linkTagUrls = filterByTagAndAttribute(
    content,
    'link',
    'href',
    startUrl,
    url
  )
  const scriptTagUrls = filterByTagAndAttribute(
    content,
    'script',
    'src',
    startUrl,
    url
  )
  const iframeTagUrls = filterByTagAndAttribute(
    content,
    'iframe',
    'src',
    startUrl,
    url
  )
  // TODO also look at srcset
  const imgTagUrls = filterByTagAndAttribute(
    content,
    'img',
    'src',
    startUrl,
    url
  )
  return [...linkTagUrls, ...scriptTagUrls, ...iframeTagUrls, ...imgTagUrls]
}

const filterByTagAndAttribute = (
  content: HTMLElement,
  tagName: string,
  attributeName: string,
  startUrl: string,
  url: string
) => {
  return content
    .querySelectorAll(tagName)
    .map((element) => {
      return {
        url,
        tagName,
        externalUrl: getFullUrl(element.getAttribute(attributeName) || '', url),
      }
    })
    .filter(
      (it) => it.externalUrl !== '' && !it.externalUrl.startsWith(startUrl)
    )
}
