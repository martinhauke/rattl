import {AxiosResponse} from "axios";

const greenText = (text: string) => `\x1b[32m${text}\x1b[0m`
const redText = (text: string) => `\x1b[31m${text}\x1b[0m`

export const writeResultToConsole = (
  url: string,
  referer: string,
  response: AxiosResponse,
  showErrorsOnly: boolean
) => {
  if (response.status === 200) {
    if (!showErrorsOnly) {
      console.log(greenText('url: ' + url))
    }
  } else {
    console.log(
      redText(
        `-----------------------------------\n` +
          `url: ${url}\n` +
          `status: ${response.status}\n` +
          `status text: ${response.statusText}\n` +
          `referer: ${referer}`
      )
    )
  }
}
