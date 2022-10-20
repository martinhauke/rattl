import axios, { AxiosResponse } from 'axios'
import parse, { HTMLElement } from 'node-html-parser'
import { writeResultToConsole } from './Output'
import { URL } from 'url'
import * as https from 'https'
import * as http from 'http'

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
  const httpAgent = new http.Agent({ family: 4 })
  const httpsAgent = new https.Agent({ family: 4 })
  return axios
    .get(url, {
      validateStatus: () => true,
      httpAgent,
      httpsAgent,
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
  showExternalLinks: boolean,
  limit?: number
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
    const nextUrls = Object.keys(uncrawledUrls).slice(0, limit)

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
  const scriptTagUrls = findUrlsInScriptTags(content, startUrl, url)
  const iframeTagUrls = filterByTagAndAttribute(
    content,
    'iframe',
    'src',
    startUrl,
    url
  )
  const imgTagUrls = findUrlsInImgTags(content, startUrl, url)

  return [...linkTagUrls, ...scriptTagUrls, ...iframeTagUrls, ...imgTagUrls]
}

const getSourceCodeFromScriptTag = (element: HTMLElement): string => {
  if (element.textContent) {
    return element.textContent
  }

  const src = element.getAttribute('src')
  if (src) {
    const httpAgent = new http.Agent({ family: 4 })
    const httpsAgent = new https.Agent({ family: 4 })
    axios
      .get(src, {
        validateStatus: () => true,
        httpAgent,
        httpsAgent,
      })
      .then((respone) => {
        return respone.data
      })
      .catch((e) => {
        console.log(e.message)
      })
  }

  return ''
}

const findUrlsInSourceCode = (
  content: HTMLElement,
  startUrl: string
): string[] => {
  const urlRegex =
    /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g
  const urlsInSource = content.querySelectorAll('script').map(
    (it) =>
      getSourceCodeFromScriptTag(it)
        .match(urlRegex)
        ?.filter((urlInCode) => !urlInCode.startsWith(startUrl)) || []
  )

  return urlsInSource.flat()
}

const findUrlsInScriptTags = (
  content: HTMLElement,
  startUrl: string,
  url: string
): ExternalResource[] => {
  const urlsInSrcAttribute = filterByTagAndAttribute(
    content,
    'script',
    'src',
    startUrl,
    url
  )

  const urlsInSoruceCode: ExternalResource[] = findUrlsInSourceCode(
    content,
    startUrl
  ).map((externalUrl) => {
    return { url, tagName: 'script (source code)', externalUrl }
  })

  return [...urlsInSrcAttribute, ...urlsInSoruceCode]
}

const findUrlsInImgTags = (
  content: HTMLElement,
  startUrl: string,
  url: string
): ExternalResource[] => {
  const urlsInSrc: ExternalResource[] = filterByTagAndAttribute(
    content,
    'img',
    'src',
    startUrl,
    url
  )

  const urlsInSrcSet: ExternalResource[] = content
    .querySelectorAll('img')
    .map((element) => {
      return (
        element
          .getAttribute('srcset')
          ?.split(',')
          .map((it) => it.trim()) || []
      )
    })
    .flat()
    .filter((it) => it !== '' && !it.startsWith(startUrl))
    .map((u) => {
      return {
        url,
        tagName: 'img',
        externalUrl: getFullUrl(u, url),
      }
    })

  return [...urlsInSrc, ...urlsInSrcSet]
}

const filterByTagAndAttribute = (
  content: HTMLElement,
  tagName: string,
  attributeName: string,
  startUrl: string,
  url: string
): ExternalResource[] => {
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
