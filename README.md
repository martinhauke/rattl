# Rattl - A simple web crawler

**This is still WIP, use with care.**

A crawler that checks a given website for errors, dead links and external content.


## Prerequisites

- nvm
- yarn


## Usage

_Clone this repo and install the dependencies with `nvm use && yarn`._

```shell
yarn execute -u <URL> [-eR] [-limit <limit>]
```


### Options

```
-e, --errors-only
  Only show urls with errors (e.g. 404, external Resources)

-R, --show-external-resources
  Show urls that use external resources (e.g. media embeds, external javascript, images)

-l, --limit <limit>
  Limit the amount of parallel requests. This might be needed for some sites to avoid timeouts or simply exceeding the
  maximum amount of parallel requests the server is allowed to handle.
```

### Example

To crawl https://your.website.com, you can type:

```shell
yarn execute -u https://your.website.com
```

_TIP: You might want to pipe the output into a file:_
```shell
yarn execute -u https://your.website.com -e > your.website.log
```


## Dev setup

- clone this repo
- run `nvm use && yarn` to install the dependencies
- run `yarn execute --url https://example.com` to crawl example.com


## Known issues

This is still a WIP and supposed to be a pragmatic and quick solution to find potential problems on a website. It is far
from perfect though.

Some known issues are:

- Redirects can result in incorrectly interpreted links and cause 404 errors or false positives for external resources
- The script is not optimized for performance

