---
title: Listen to Doctrine Events on Entities Using a PHP Attribute
tags:
  - php
  - php attribute
  - symfony
  - doctrine
  - doctrine entity listener
date: 2023-11-12
summary: Learn how to listen to Doctrine events thanks to a PHP attribute.
dependencies:
  - PHP
  - Symfony
  - Doctrine
proficiencyLevel: Expert
---

# {{ $frontmatter.title }}

## A Bit of Context...

At [Wamiz](https://wamiz.co.uk/), we started working on a proof of concept (POC) to implement [Meilisearch](https://meilisearch.com/) to offer our users a search engine, topic suggestions, etc.

Meilisearch needs to be fed with data from our database and updated based on changes to our Doctrine entities. Therefore, we need to:

1. Identify the Doctrine entities to index
2. Automatically index/unindex Doctrine entities based on their lifecycle
3. As a bonus, handle the initial indexing of our existing Doctrine entities

Having previously used the [AlgoliaSearchBundle](https://github.com/algolia/search-bundle), I had experience with these issues, and I knew they could be partially solved with a configuration like this:

```yaml
algolia_search:
  indices:
    - name: posts
      class: App\Entity\Post
      index_if: isPublished
```

It's easy to understand, allows centralized declaration of entities to index, and provides control over which entities to listen to. However:

- It uses YAML 😞
- There is little to no auto-completion or validation
- I want the configuration to be in the code of our Doctrine entities (as close to the code as possible), not in a configuration file
- It's 2023, and I finally want to write a PHP attribute! 👀

With a PHP attribute named `IndexableEntity` that we will create later, we can do something like this:

```php
<?php

// ...

#[ORM\Entity]
#[IndexableEntity(
    index: 'posts',
    indexIf: 'isPublished',
    # Used for initial indexing, not covered in this blog post
    initialDataCriteria: [PostRepository::class, 'createMeilisearchIndexableCriteria'],
)]
class Post
{
    // ...
}
```

And this would easily allow us to:

- Declare entities to index in a decentralized manner
- Have auto-completion and configuration validation (thanks to PHPStan)

## Creating the PHP Attribute

Our PHP attribute will:

- Define the Meilisearch index in which the entity will be indexed
- Define a method to call to check if the entity is indexable
- Define a callback to retrieve the initial data to index (e.g., if we don't want to index entities created more than N years ago)

To create a PHP attribute, we need to create an annotated class with the `#[Attribute]` attribute.

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\Attribute;

#[\Attribute(\Attribute::TARGET_CLASS)]
final class IndexableEntity
{
    /**
     * @param string        $index               A Meilisearch index where the entity will be indexed
     * @param string|null   $indexIf             A method name to call to check if the entity is indexable (if null, the entity is always indexable)
     * @param callable|null $initialDataCriteria A callback to retrieve the initial data to index
     */
    public function __construct(
        public string $index,
        public string|null $indexIf = null,
        public mixed $initialDataCriteria = null,
    ) {
        if (!is_callable($initialDataCriteria)) {
            throw new \InvalidArgumentException('The initial data criteria must be a callable.');
        }
    }
}
```

## Listening to Changes on Doctrine Entities with the `IndexableEntity` Attribute

There are several solutions to listen to changes on Doctrine entities with the `IndexableEntity` attribute:

1. Use a [CompilerPass](https://symfony.com/doc/current/service_container/compiler_passes.html),
   but it won't work simply because our entities are not registered in the Symfony Container (and fortunately so).
2. Use a [Doctrine Lifecycle Listener](https://symfony.com/doc/current/doctrine/events.html#doctrine-lifecycle-listeners).
   This is a solution I didn't choose because I didn't want to use a listener that would listen to **all** Doctrine events on **all** entities and have to filter entities with the `IndexableEntity` attribute.
3. Use a [Doctrine Entity Listener](https://symfony.com/doc/current/doctrine/events.html#doctrine-entity-listeners)
   to listen the `loadClassMetadata`, `postPersist`/`postUpdate`/`preRemove` events on Doctrine entities.

I chose the 3rd solution, as it seems cleaner and more performant (although I haven't done [Blackfire traces](2023-10-21-blackfire-and-symfony-cli.md)).
However, with more hindsight, I think the 2nd solution would have been better in terms of maintainability and understanding.

So, our `IndexationListener` will looks like this:

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\EventListener;

use App\Meilisearch\IndexationHelper;
use Doctrine\ORM\EntityManagerInterface;

#[AsDoctrineListener(Events::loadClassMetadata)]
final class IndexationListener
{
    /**
     * @var list<class-string>
     */
    private array $listenedEntities = [];

    public function loadClassMetadata(LoadClassMetadataEventArgs $args): void
    {
        $metadata = $args->getClassMetadata();

        // We only want to listen to entities once
        if (\in_array($metadata->getName(), $this->listenedEntities, true)) {
            return;
        }

        if ([] === $metadata->getReflectionClass()->getAttributes(IndexableEntity::class)) {
            return;
        }

        $metadata->addEntityListener('postPersist', self::class, 'postPersist');
        $metadata->addEntityListener('postUpdate', self::class, 'postUpdate');
        $metadata->addEntityListener('preRemove', self::class, 'preRemove');

        $this->listenedEntities[] = $metadata->getName();
    }

    public function postPersist(object $indexableEntity): void
    {
        $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity);

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to index the entity
    }

    public function postUpdate(object $indexableEntity): void
    {
        $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity);

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to index the entity
    }

    public function preRemove(object $indexableEntity): void
    {
        $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity);

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to remove the entity
    }
}
```

The method `IndexationHelper::getAttribute` will be used to retrieve the instance of the `IndexableEntity` attribute from the entity, but this detail will not be covered in this article.

### Configuring the `EntityListenerServiceResolver` of Doctrine

The final step with the 2nd solution is to configure the Doctrine `EntityListenerServiceResolver` to inject
our `IndexationListener` present in the Symfony Container instead of letting Doctrine handle it
(because if our `IndexationListener` depends on services, it will be messed up).

For this, we can create the Symfony CompilerPass:

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\DependencyInjection\Compiler;

use App\Meilisearch\EventListener\IndexationListener;
use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

final class RegisterIndexationListenerPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container)
    {
        $resolver = $container->getDefinition('doctrine.orm.default_entity_listener_resolver');
        $resolver->addMethodCall(
            'register',
            [new Reference(IndexationListener::class)],
        );
    }
}
```

## Usage

Thanks to the use of Doctrine listeners, there are no additional modifications to be made in the code; `persist()`, `flush()`, and `remove()` work as usual:

```php
<?php

$post = new Post(
    title: 'My post',
);
$entityManager->persist($post);
$entityManager->flush();

// The method `IndexationListener::postPersist()` will be called
```

## Going Further

### Migrating to a Doctrine Lifecycle Listener

As mentioned earlier, this is the solution I should have chosen, as it is simpler to understand and maintain, but probably less performant.

This will require the following modifications:

1. Remove the `RegisterIndexationListenerPass`
2. Transform the `IndexationListener` as follows:

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\EventListener;

use App\Meilisearch\IndexationHelper;
use Doctrine\ORM\EntityManagerInterface;

#[AsDoctrineListener(event: Events::postPersist, priority: 500, connection: 'default')]
#[AsDoctrineListener(event: Events::postUpdate, priority: 500, connection: 'default')]
#[AsDoctrineListener(event: Events::preRemove, priority: 500, connection: 'default')]
final class IndexationListener
{
    public function postPersist(PostPersistEventArgs $args): void
    {
        $entity = $args->getObject();

        if (null === $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity)) {
            return;
        }

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to index the entity
    }

    public function postUpdate(PostUpdateEventArgs $args): void
    {
        $entity = $args->getObject();

        if (null === $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity)) {
            return;
        }

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to index the entity
    }

    public function preRemove(PreRemoveEventArgs $args): void
    {
        $entity = $args->getObject();

        if (null === $indexableEntityAttribute = IndexationHelper::getAttribute($indexableEntity)) {
            return;
        }

        // TODO: do something with the attribute and $indexableEntity, ex: dispatch a Messenger message to index the entity
    }
}
```
