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

# Profiling a Symfony-CLI project with Blackfire

::: warning
In this post, I assume you already have a Symfony project that uses the [Symfony CLI](https://github.com/symfony-cli/symfony-cli).
If you don't know what's Symfony CLI, you can refer to my [French post about our new technical stack with the Symfony CLI](./2021-04-26-migration-stack-developpement.md#symfony-cli-sparkles).
:::

## What is Blackfire?

[Blackfire](https://blackfire.io/) is a tool that allows you to profile your PHP applications.

It can be used on PHP script (like Symfony Commands) or on HTTP requests (browser or cURL),
and it will give you a lot of information about the execution of your code, the bottlenecks, the memory usage, etc.

If you have any performance issues in your code, this is to me the most powerful tool to find the root cause of your problems.

## What's so special about the Symfony CLI, which requires a dedicated post?

The Symfony CLI comes with a [Docker Compose integration](https://symfony.com/doc/current/setup/symfony_server.html#docker-integration) and
[per-project PHP different version or settings](https://symfony.com/doc/current/setup/symfony_server.html#docker-integration).

It means that you **must** use the Symfony CLI command `symfony` to execute PHP script (e.g.: `symfony php ./my-script.php`) or a
Symfony command `symfony console app:my-command`).

It all depends on what you want to profile, and how.

### Profiling a PHP Script

Nothing fancy, you can use `blackfire run symfony php ./my-script.php` to profile your PHP script.

### Profiling a Symfony command

Nothing fancy either, you can use `blackfire run symfony console app:my-command` to profile your Symfony command.

### Profiling an HTTP request in your browser

You can use the [Blackfire browser extension](https://blackfire.io/docs/integrations/browsers/index) to profile an HTTP request in your browser.

After authenticating yourself to your Blackfire account, you can click on the extension icon, then `Profile` button.

::: tip
If you need to profile a `POST` request (or whatever the method, I mean when you submit data for example), you can use `Profile all requests`.
It will automatically listen all HTTP requests made during this time (navigation, but also `XMLHttpRequest` and `fetch` if I'm not wrong).
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

To configure cURL for using a proxy, there are two ways:

1. either pass the option `--proxy` followed by the proxy URL
2. either use environment variables `http_proxy` and `https_proxy` (or `HTTP_PROXY` and `HTTPS_PROXY`, but we prefer [the lowercase version](https://everything.curl.dev/usingcurl/proxies/env#http_proxy-in-lower-case-only))

It's a personal choice, but I prefer the second solution (env vars FTW).

#### Getting the Symfony Proxy URL

Before the [Symfony CLI version 5.4.20](https://github.com/symfony-cli/symfony-cli/releases/tag/v5.4.20), one programmatic way to get the Symfony Proxy URL is to play with file and string manipulations:

```shell
$ echo $(cat ~/.symfony5/proxy.json | jq -r '(.host + ":" + (.port|tostring))')

# will outputs something like "localhost:7080"
```

However, there is now a dedicated command that does the job ([thanks to me :smirking_face:](https://github.com/symfony-cli/symfony-cli/pull/233)):

```shell
$ symfony local:proxy:url

# will outputs something like "http://127.0.0.1:7080"
```

## Using a Bash script wrapper

So, to automatically export `HTTP_PROXY` and `HTTPS_PROXY` environnement variables before running Blackfire,
we can write a simple Bash script wrapper `bin/blackfire`:

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

I prefer this solution over others, because:

1. it's easy to understand
2. it's easy to maintain
3. it's easy to share with your team (especially if they use different operating systems)
4. it's easy to update (e.g.: if you want to add a new option to the Blackfire command)

You can use it like this:

```shell
$ bin/blackfire curl https://my-symfony-app.wip
$ bin/blackfire run symfony console app:my-command
$ bin/blackfire run symfony php ./my-script.php
```

### Bonus: Automatically configure the Blackfire Environnement

AFAIK there is no way to globally configure the default [Blackfire environnement](https://blackfire.io/docs/reference-guide/environments).
This is something you must do manually, by passing the option `--env` to the `blackfire` command.

But this is boring, instead we can update our Bash script wrapper to automatically configure the Blackfire environnement:

```bash
#!/usr/bin/env bash

# Check for Blackfire binary
if [[ ! -x "$(command -v blackfire)" ]]; then
    echo "Unable to find the Blackfire binary, please follow the installation instructions at https://www.notion.so/wamiz/Installation-b9dbc1a1f3a14ba29f3fa5031c60e57e"
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
