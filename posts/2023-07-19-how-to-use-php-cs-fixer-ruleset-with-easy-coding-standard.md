---
title: 'How to use PHP CS Fixer ruleset with Easy Coding Standard'
tags:
  - php
  - php-cs-fixer
  - easy-coding-standard
date: 2023-07-19
description: How can we configure Easy Coding Standard to use PHP CS Fixer ruleset?
dependencies:
  - PHP
  - PHP CS Fixer
  - Easy Coding Standard
proficiencyLevel: Beginner
---

# {{ $frontmatter.title }}

<PostMeta class="mt-2" :date="$frontmatter.date" :tags="$frontmatter.tags" :lang="$frontmatter.lang" />

This post is a quick guide on how to use the [`@Symfony` ruleset from PHP CS Fixer](https://cs.symfony.com/doc/ruleSets/Symfony.html) with [Easy Coding Standard](https://github.com/easy-coding-standard/easy-coding-standard), since this ruleset is not shipped anymore with ECS.

## What is Easy Coding Standard?

Easy Coding Standard is a tool that helps you to check your code against PHP coding standards.

The main advantage of Easy Coding Standard is that it wraps [PHP CS Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer) and [PHP_CodeSniffer](https://github.com/squizlabs/PHP_CodeSniffer) to provide a [unified interface for both tools](https://tomasvotruba.com/blog/2017/05/03/combine-power-of-php-code-sniffer-and-php-cs-fixer-in-3-lines/),
meaning that you can easily use both tools with the same configuration file and a single command.

It also comes with some ruleset out of the box, and even if they are great, there is no [Symfony](https://github.com/symfony/symfony) related ruleset anymore, so we need to find a way to use the [`@Symfony` ruleset from PHP CS Fixer](https://cs.symfony.com/doc/ruleSets/Symfony.html).

## Using PHP CS Fixer ruleset with Easy Coding Standard

Assuming that you already have Easy Coding Standard installed and configured through the following commands:

```bash
composer require --dev symplify/easy-coding-standard
./vendor/bin/ecs
```

You will need to update your `ecs.php` configuration file to use the `FixerFactory` and `RuleSet` classes from PHP CS Fixer, and manually register PHP CS Fixer fixers through the `ECSConfig#rule` and `ECSConfig#ruleWithConfiguration` methods:

```php
<?php

declare(strict_types=1);

use PhpCsFixer\FixerFactory;
use PhpCsFixer\RuleSet\RuleSet;
use Symplify\EasyCodingStandard\Config\ECSConfig;

return function (ECSConfig $ecsConfig): void {
    $ecsConfig->paths([
        __DIR__ . '/src',
        __DIR__ . '/tests',
    ]);

     // Configure Symfony and Symfony Risky SetList from PHP-CS-Fixer, since they are not shipped anymore with Easy Coding Standard.
    $fixerFactory = new FixerFactory();
    $fixerFactory->registerBuiltInFixers();
    $fixerFactory->useRuleSet($ruleSet = new RuleSet([
        '@Symfony' => true,
        // You can also enable the risky ruleset if you want.
        //'@Symfony:risky' => true,
    ]));

    foreach ($fixerFactory->getFixers() as $fixer) {
        if (null !== $fixerConfiguration = $ruleSet->getRuleConfiguration($fixer->getName())) {
            $ECSConfig->ruleWithConfiguration($fixer::class, $fixerConfiguration);
        } else {
            $ECSConfig->rule($fixer::class);
        }
    }
};
```

And voilà! You can now run Easy Coding Standard with the Symfony ruleset from PHP CS Fixer.
