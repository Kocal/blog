---
title: Profiling cURL HTTP requests and Symfony Commands with Blackfire, when using the Symfony CLI
tags:
  - php
  - symfony-cli
  - blackfire
  - profiling
date: 2023-10-21
summary: Discover how to easily profile Symfony Commands and cURL HTTP requests with Blackfire when your project uses Symfony CLI.
dependencies:
  - PHP
  - Symfony CLI
  - Blackfire
proficiencyLevel: Beginner
---

# {{ $frontmatter.title }}

<PostMeta class="mt-2" :date="$frontmatter.date" :tags="$frontmatter.tags" :lang="$frontmatter.lang" />

::: warning
In this post, I assume you already have a Symfony project that uses the [Symfony CLI](https://github.com/symfony-cli/symfony-cli).
If you're unfamiliar with Symfony CLI, you can refer to my [French post about our new technical stack with Symfony CLI](./2021-04-26-migration-stack-developpement.md#symfony-cli-sparkles).
:::

## What is Blackfire?

[Blackfire](https://blackfire.io/) is a tool that allows you to profile your PHP applications.

You can use it for PHP scripts (like Symfony Commands) or for HTTP requests in your browser or via cURL.
Blackfire provides detailed insights into the execution of your code, identifying bottlenecks and monitoring memory usage.

If you encounter any performance issues in your code, Blackfire is the most powerful tool to identify the root causes.

## What's so special about the Symfony CLI

Symfony CLI comes with a [Docker Compose integration](https://symfony.com/doc/current/setup/symfony_server.html#docker-integration) and allows for [per-project PHP version or settings](https://symfony.com/doc/current/setup/symfony_server.html#docker-integration).

This means you **must** use the Symfony CLI command `symfony` to execute PHP scripts (e.g., `symfony php ./my-script.php`) or a Symfony command (`symfony console app:my-command`), depending on what you want to profile and how.

### Profiling a PHP Script

To profile your PHP script, use `blackfire run symfony php ./my-script.php`.

### Profiling a Symfony command

For profiling Symfony commands, use `blackfire run symfony console app:my-command`.

### Profiling an HTTP request in your browser

You can use the [Blackfire browser extension](https://blackfire.io/docs/integrations/browsers/index) to profile an HTTP request in your browser.

After authenticating yourself to your Blackfire account, click on the extension icon, then the `Profile` button.

::: tip
For profiling a `POST` request or other methods involving data submission,
use `Profile all requests` to automatically capture all HTTP requests during that period,
including `XMLHttpRequest` and `fetch`.
:::

### Profiling an HTTP request with cURL

Finally, this is the most interesting and _complex_ part of the four.

Sometimes you might want to profile a [cURL](https://curl.se/) request (e.g.: you can change the request payload before sending it, scripting, ...), and for that, you can use `blackfire curl`:

```shell
$ blackfire curl https://my-symfony-app.wip

(...)

curl: (6) Could not resolve host: my-symfony-app.wip
```

![Bob](../posts-assets/bob.jpg)

**What happened?** To understand the problem, we must know how things work. How `my-symfony-app.wip` can target a specific local web server?

#### Resolving local domain names

Here, `my-symfony-app.wip` is a [Local Domain Names](https://symfony.com/doc/current/setup/symfony_server.html#local-domain-names).

To resolve local domain name to your web server (ran through `symfony serve`), the Symfony CLI needs a [Local Proxy](https://symfony.com/doc/current/setup/symfony_server.html#setting-up-the-local-proxy).

Depending on your operating system and how you configured the Local Proxy, there is a high chance
the Symfony CLI proxy is not globally configured.

It means **you must tell cURL to use the Symfony Local Proxy** to request your application.

#### Configure cURL to use a proxy

There are two ways to tell cURL to use a proxy:

1. either pass the option `--proxy` followed by the proxy URL
2. either use environment variables `http_proxy` and `https_proxy` (or `HTTP_PROXY` and `HTTPS_PROXY`, but we prefer [the lowercase version](https://everything.curl.dev/usingcurl/proxies/env#http_proxy-in-lower-case-only))

It's a personal choice, but I prefer the second solution (env vars FTW).

#### Getting the Symfony Proxy URL

Before the [Symfony CLI version 5.4.20](https://github.com/symfony-cli/symfony-cli/releases/tag/v5.4.20), one programmatic way to get the Symfony Proxy URL is to play with file and string manipulations:

```shell
$ echo $(cat ~/.symfony5/proxy.json | jq -r '(.host + ":" + (.port|tostring))')

# will outputs something like "localhost:7080"
```

Since, there is a dedicated command to get the Symfony Proxy URL ([thanks to me :smirking_face:](https://github.com/symfony-cli/symfony-cli/pull/233)):

```shell
$ symfony local:proxy:url

# will outputs something like "http://127.0.0.1:7080"
```

## Using a Bash script wrapper

To simplify the process, we create a Bash script wrapper `bin/blackfire`,
to automatically export `HTTP_PROXY` and `HTTPS_PROXY` environment variables before running Blackfire:

```bash
#!/usr/bin/env bash

# Check for Blackfire binary
if [[ ! -x "$(command -v blackfire)" ]]; then
    echo "Unable to find the Blackfire binary, please follow the installation instructions at https://www.notion.so/wamiz/Installation-b9dbc1a1f3a14ba29f3fa5031c60e57e"
    exit 1;
fi;

export HTTP_PROXY=$(symfony proxy:url)
export HTTPS_PROXY=$(symfony proxy:url)

blackfire $@
```

This solution is easy to understand, maintain, share with your team, and update for additional options.

You can use it as follows:

```shell
$ bin/blackfire curl https://my-symfony-app.wip
$ bin/blackfire run symfony console app:my-command
$ bin/blackfire run symfony php ./my-script.php
```

### Bonus: Automatically Configure the Blackfire Environment

Although there is no global configuration option for the default [Blackfire environnement](https://blackfire.io/docs/reference-guide/environments),
you can update the Bash script wrapper to automatically configure it:

```bash
#!/usr/bin/env bash

if [[ ! -x "$(command -v blackfire)" ]]; then
    echo "Unable to find the Blackfire binary."
    exit 1;
fi;

export HTTP_PROXY=$(symfony proxy:url)
export HTTPS_PROXY=$(symfony proxy:url)

ARGS=()
for arg in "$@"; do
    if [[ $arg == 'curl' ]] || [[ $arg == 'run' ]]; then
        ARGS+=("$arg")
        # Update your Blackfire environnement UUID here
        ARGS+=("--env=aaaaaaaa-bbbb-cccc-dddd-efghijklmnop")
        ARGS+=("--")
    else
        ARGS+=("$arg")
    fi
done

blackfire ${ARGS[@]}
```
