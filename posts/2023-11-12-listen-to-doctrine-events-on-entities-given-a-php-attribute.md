---
title: Listen to Doctrine events on entities given a PHP attribute
tags:
  - php
  - php attribute
  - symfony
  - doctrine
  - doctrine entity listener
date: 2023-11-12
summary:
dependencies:
  - PHP
  - Symfony
  - Doctrine
proficiencyLevel: Expert
---

# {{ $frontmatter.title }}

<PostMeta class="mt-2" :date="$frontmatter.date" :tags="$frontmatter.tags" :lang="$frontmatter.lang" />

## Un peu de contexte...

Chez [Wamiz](https://wamiz.co.uk/), on a commencé à travailler sur un POC de mise en place de [Meilisearch](meilisearch.com/) afin de proposer
à nos utilisateurs un moteur de recherche, une suggestion de topics similaires, etc.

Meilisearch doit être alimenté avec les données de notre base de données, et doit être mis à jour en fonction des modifications de nos entités Doctrine.
Pour cela, il faut donc :

1. Identifier les entités Doctrine à indexer
2. Indéxer/désindexer automatiquement les entités Doctrine en fonction de leur cycle de vie
3. En bonus, gérer l'indexation initiale de nos entités Doctrine déjà existantes

Ayant déjà utilisé le [AlgoliaSearchBundle](https://github.com/algolia/search-bundle), j'avais déjà pas mal d'expérience sur ces différentes problématiques,
et qu'elles pouvaient être résolues en partie avec une telle configuration :

```yaml
algolia_search:
  indices:
    - name: posts
      class: App\Entity\Post
      index_if: isPublished
```

C'est simple à comprendre, ça permet de déclarer les entités à indexer de manière centralisée, ça permet de contrôler quelles sont les entités à écouter, mais :

- Ça utilise du YAML :disappointed:
- Il n'y a pas/peu d'auto-complétion ou de validation
- Je souhaite que la configuration se fasse dans le code nos entités Doctrine (le plus proche du code possible), et non pas dans un fichier de configuration
- Puis... on est en 2023, je veux enfin écrire un attribut PHP :eyes:

Avec un attribut PHP, nommé `IndexableEntity` que l'on va créer plus tard, on pourra faire quelque chose comme ça :

```php
<?php

// ...

#[ORM\Entity]
#[IndexableEntity(
    index: 'posts',
    indexIf: 'isPublished',
    # Est utilisé pour l'indexation initiale, non traitée dans ce blog post
    initialDataCriteria: [PostRepository::class, 'createMeilisearchIndexableCriteria'],
)]
class Post
{
    // ...
}
```

Et cela permettrait facilement de :

- Déclarer les entités à indexer de manière décentralisée
- Avoir une auto-complétion et une validation de la configuration (grâce à PHPStan)

## Création de l'attribut PHP

Notre attribut PHP permettra de :

- Définir l'index Meilisearch dans lequel l'entité sera indexée
- Définir une méthode à appeler pour savoir si l'entité est indexable
- Définir un callback pour récupérer les données initiales à indexer (ex : si on ne souhaite pas indexer des entités créées il y a plus de N années)

Pour créer un attribut PHP, il faut créer une classe annotée portant l'attribut `#[Attribute]`.

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\Attribute;

#[\Attribute(\Attribute::TARGET_CLASS)]
final readonly class IndexableEntity
{
    /**
     * @param string        $index               A Meilisearch index, where the entity will be indexed
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

## Écouter les modifications sur nos entités Doctrine portant l'attribut `IndexableEntity`

Il y a plusieurs solutions pour écouter les modifications sur nos entités Doctrine portant l'attribut `IndexableEntity` :

1. Utiliser une [CompilerPass](https://symfony.com/doc/current/service_container/compiler_passes.html),
   mais ça ne fonctionnera pas tout simplement parce que nos entités ne sont pas enregistrées dans le Container Symfony (et heureusement)
2. Utiliser un [Doctrine Lifecycle Listener](https://symfony.com/doc/current/doctrine/events.html#doctrine-lifecycle-listeners),
   c'est une solution que je n'ai pas choisie, car je ne souhaitais pas utiliser un listener qui allait écouter **tous** les événements
   Doctrine sur **toutes** les entités, et de devoir filtrer les entités portant l'attribut `IndexableEntity`.
3. Utiliser un [Doctrine Entity Listener](https://symfony.com/doc/current/doctrine/events.html#doctrine-entity-listeners)
   qui écoutera sur les events `loadClassMetadata`, `postPersist` / `postUpdate` / `preRemove` sur les entités Doctrine.

J'ai donc choisi la troisième solution, elle me parait plus propre et plus performante (même si je n'ai pas fait de traces Blackfire),
mais avec plus de recul, je pense que la deuxième solution aurait été meilleure en termes de maintenabilité et compréhension.

Notre `IndexationListener` ressemble donc à ça :

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\EventListener;

use App\Meilisearch\IndexationHelper;
use Doctrine\ORM\EntityManagerInterface;

#[AsDoctrineListener(Events::loadClassMetadata)]
final readonly class IndexationListener
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

La méthode `IndexationHelper::getAttribute` sera utilisée pour récupérer l'instance de l'attribut `IndexableEntity` depuis l'entité, mais c'est un détail qui ne sera pas abordé dans cet article.

### Configurer l'`EntityListenerServiceResolver` de Doctrine

Dernière étape avec la troisième solution, il faut configurer l'`EntityListenerServiceResolver` de Doctrine,
afin d'y injecter notre `IndexationListener` présent dans le Container Symfony au lieu de laisser Doctrine s'en charger (car si notre `IndexationListener` dépend de services, ça sera foutu).

Pour cela, on peut créer la CompilerPass Symfony :

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\DependencyInjection\Compiler;

use App\Meilisearch\EventListener\IndexationListener;
use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

final readonly class RegisterIndexationListenerPass implements CompilerPassInterface
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

## Utilisation

Grâce à l'utilisation de listeners Doctrine, il n'y a pas de modifications supplémentaires à faire dans le code, les `persist()`, `flush()` et `remove()` fonctionnent comme d'habitude :

```php
<?php

$post = new Post(
    title: 'My post',
);
$entityManager->persist($post);
$entityManager->flush();

// La méthode `IndexationListener::postPersist()` sera appelée
```

## Aller plus loin

### Migrer vers un Lifecycle Listener Doctrine

Comme dit plus haut, c'est la solution que j'aurais dû choisir, car elle est plus simple à comprendre et à maintenir, mais sans doute moins performante.

Cela demandera les modifications suivantes :

1. Supprimer la `RegisterIndexationListenerPass`
2. Transformer le `IndexationListener` de cette façon :

```php
<?php

declare(strict_types=1);

namespace App\Meilisearch\EventListener;

use App\Meilisearch\IndexationHelper;
use Doctrine\ORM\EntityManagerInterface;

#[AsDoctrineListener(event: Events::postPersist, priority: 500, connection: 'default')]
#[AsDoctrineListener(event: Events::postUpdate, priority: 500, connection: 'default')]
#[AsDoctrineListener(event: Events::preRemove, priority: 500, connection: 'default')]
final readonly class IndexationListener
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
