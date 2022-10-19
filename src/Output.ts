import { AxiosResponse } from 'axios'
import { ExternalResource } from './Crawler'

const greenText = (text: string) => `\x1b[32m${text}\x1b[0m`
const redText = (text: string) => `\x1b[31m${text}\x1b[0m`

const getTextColor = (
  responseStatus: number,
  externalResources?: ExternalResource[]
) =>
  responseStatus !== 200 || (externalResources && externalResources.length > 0)
    ? (text: string) => redText(text)
    : (text: string) => greenText(text)

const externalResourcesToString = (resources?: ExternalResource[]) => {
  if (!resources || resources.length === 0) {
    return ''
  }

  const singleResourceToString = (resource: ExternalResource) => {
    return (
      `\t\ttag name: ${resource.tagName}\n` +
      `\t\treference url: ${resource.externalUrl}`
    )
  }

  return (
    '\n\texternal resources:\n' +
    resources.map((it) => singleResourceToString(it))
  )
}

export const writeResultToConsole = (
  url: string,
  referer: string,
  response: AxiosResponse,
  showErrorsOnly: boolean,
  externalResources?: ExternalResource[]
) => {
  const colorText = getTextColor(response.status, externalResources)
  if (response.status === 200) {
    if (
      !showErrorsOnly ||
      (externalResources && externalResources.length > 0)
    ) {
      console.log(
        colorText('url: ' + url + externalResourcesToString(externalResources))
      )
    }
  } else {
    console.log(
      redText(
        `url: ${url}\n` +
          `\tstatus: ${response.status}\n` +
          `\tstatus text: ${response.statusText}\n` +
          `\treferer: ${referer}` +
          externalResourcesToString(externalResources)
      )
    )
  }
}
