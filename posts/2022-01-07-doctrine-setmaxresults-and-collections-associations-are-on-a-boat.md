---
title: 'Doctrine, QueryBuilder::setMaxResults() and collections associations are on a boat'
tags:
  - php
  - doctrine
  - database
date: 2022-01-07
summary: What happens with your Doctrine collections associations when using QueryBuilder::setMaxResults(), and how do we fix it?
dependencies:
  - PHP
  - Doctrine
proficiencyLevel: Beginner
---

<script setup>
import { useScriptTag } from '@vueuse/core';

useScriptTag('https://platform.twitter.com/widgets.js')
</script>

# {{ $frontmatter.title }}

<PostMeta class="mt-2" :date="$frontmatter.date" :tags="$frontmatter.tags" :lang="$frontmatter.lang" />

::: tip
This blog post is associated with some code that you can find [here](https://github.com/Kocal/blog/tree/main/posts-assets/2022-01-07-doctrine-setmaxresults-and-collections-associations-are-on-a-boat/demo-project).
:::

Today, we gonna talk about an issue with <abbr title="DataBase Managment System">DBMS</abbr>, [Doctrine](https://www.doctrine-project.org/), `QueryBuilder::setMaxResults()` and collections associations.
I've faced this issue while trying to optimize my code to reduce the number of SQL requests after identifying a [N+1 query issue](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping).

## Some context...

I will try to simplify as much as possible, I can't leak code from my job, but imagine we have 2 entities:

1. `Pet`, which contains 3 fields `id`, `pictures` (contains 0 or more `Picture` instances) and `createdAt`:

```php
// src/Core/Entity/Pet.php
<?php

namespace App\Core\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity()
 * @ORM\Table(name="adoption_pet")
 */
class Pet
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    protected ?int $id = null;

    /**
     * @ORM\OneToMany(targetEntity="Picture", mappedBy="pet", cascade={"all"}, orphanRemoval=true)
     */
    protected Collection $pictures;

    /**
     * @ORM\Column(type="datetime_immutable", name="created_at")
     */
    protected \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->pictures = new ArrayCollection();
    }

    /**
     * @return int|null
     */
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPictures(): Collection
    {
        return $this->pictures;
    }

    public function addPicture(Picture $picture): void
    {
        if (!$this->pictures->contains($picture)) {
            $this->pictures->add($picture);
            $picture->setPet($this);
        }
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): void
    {
        $this->createdAt = $createdAt;
    }
}
```

2. `Picture`, which contains 2 fields `id` and `pet` (linked to 1 `Pet`):

```php
// src/Core/Entity/Picture.php
<?php

namespace App\Core\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity()
 * @ORM\Table(name="adoption_pet_picture")
 */
class Picture
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    protected ?int $id = null;

    /**
     * @ORM\ManyToOne(targetEntity="Pet", inversedBy="pictures")
     * @ORM\JoinColumn(onDelete="CASCADE")
     */
    protected ?Pet $pet = null;

    // ...

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setPet(?Pet $pet): void
    {
        $this->pet = $pet;
    }

    public function getPet(): ?Pet
    {
        return $this->pet;
    }
}
```

And we have a seeded database like this;

- the 1st `Pet` has 4 `Picture`,
- the 2nd `Pet` has 2 `Picture`,
- the 3rd and last `Pet` has 0 `Picture`:

```php
$entityManager = ...;

$pet1 = new Pet();
$pet1->setCreatedAt(new \DateTimeImmutable('+1 min'));
$pet1->addPicture($picture1 = new Picture());
$pet1->addPicture($picture2 = new Picture());
$pet1->addPicture($picture3 = new Picture());
$pet1->addPicture($picture4 = new Picture());
$entityManager->persist($pet1);

$pet2 = new Pet();
$pet2->setCreatedAt(new \DateTimeImmutable('+2 min'));
$pet2->addPicture($picture1 = new Picture());
$pet2->addPicture($picture2 = new Picture());
$entityManager->persist($pet2);

$pet3 = new Pet();
$pet3->setCreatedAt(new \DateTimeImmutable('+3 min'));
$entityManager->persist($pet3);

$entityManager->flush();
```

We are ready!

## So what's the issue?

If we want to fetch the 1st created entity `Pet` from the database, we can do something like this:

```php
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$pet = $qb->getQuery()->getSingleResult();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "4"
```

`$pet` is an instance of `Pet`, `$pet->getPictures()` returns 4 `Picture`, everything is fine... except we have a _N+1 query_ issue when using `$pet->getPictures()`, because we didn't join the field `pictures`.

So let's join `pictures` and select it aswell:

```php {3,5}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->addSelect('pictures')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$pet = $qb->getQuery()->getSingleResult();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "1"... wait what?
```

`$pet` is still as instance of `Pet`, **but** `$pet->getPictures()` returns only 1 `Picture` instead of 4.

**Why?**

This is easily understandable if we take a look to the SQL query generated by Doctrine:

```sql
SELECT
       a0_.id AS id_0,
       a0_.created_at AS created_at_1,
       a1_.id AS id_2,
       a1_.pet_id AS pet_id_3
FROM adoption_pet a0_
    LEFT JOIN adoption_pet_picture a1_ ON a0_.id = a1_.pet_id
ORDER BY a0_.created_at ASC
LIMIT 1
```

The issue comes from the `LIMIT 1` clause. It allows us to fetch only 1 `Pet`, **but** is also half-initialize our `Pictures`:

| id_0 | created_at_1        | id_2 | pet_id_3 |
| :--- | :------------------ | :--- | :------- |
| 1    | 2022-01-08 09:31:48 | 1    | 1        |

This is documented on Doctrine website, but I wasn't aware at all about this behaviour:

> "If your query contains a fetch-joined collection specifying the result limit methods are not working as you would expect. Set Max Results restricts the number of database result rows, however in the case of fetch-joined collections one root entity might appear in many rows, effectively hydrating less than the specified number of results."
>
> — [First and Max Result Items (DQL Query Only)](https://www.doctrine-project.org/projects/doctrine-orm/en/latest/reference/dql-doctrine-query-language.html#first-and-max-result-items-dql-query-only):

## How to avoid that?

### The Doctrine's `Paginator`

Doctrine provides a class [`Paginator`](https://www.doctrine-project.org/projects/doctrine-orm/en/2.6/tutorials/pagination.html) which allows to use `->setMaxResults()` and collections associations:

```php {9-10}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->addSelect('pictures')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$paginator = new \Doctrine\ORM\Tools\Pagination\Paginator($qb->getQuery(), $fetchJoinCollection = true);
$pet = $paginator->getIterator()->current();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "4"
```

Internally, the `Paginator` clone your `Query` and use it for two SQL requests:

1. Fetch a or multiple identifier(s) (if you used `->setMaxResults(>1)`):

```sql
SELECT DISTINCT id_0
FROM (SELECT DISTINCT id_0, created_at_1
      FROM (SELECT a0_.id AS id_0, a0_.created_at AS created_at_1, a1_.id AS id_2, a1_.pet_id AS pet_id_3
            FROM adoption_pet a0_
                     LEFT JOIN adoption_pet_picture a1_ ON a0_.id = a1_.pet_id) dctrn_result_inner
      ORDER BY created_at_1 ASC) dctrn_result
LIMIT 1;
```

Which returns:
| id_0 |
| :--- |
| 1 |

2. And then, it uses this result to _nicely_ fetch your entities with their collections associations:

```sql
SELECT a0_.id AS id_0, a0_.created_at AS created_at_1, a1_.id AS id_2, a1_.pet_id AS pet_id_3
FROM adoption_pet a0_
         LEFT JOIN adoption_pet_picture a1_ ON a0_.id = a1_.pet_id
WHERE a0_.id IN (?)
ORDER BY a0_.created_at ASC
```

Which returns 4 rows (because our 1st `Pet` has 4 `Picture`):
| id_0 | created_at_1 | id_2 | pet_id_3 |
| :--- | :--- | :--- | :--- |
| 1 | 2022-01-08 09:31:48 | 1 | 1 |
| 1 | 2022-01-08 09:31:48 | 2 | 1 |
| 1 | 2022-01-08 09:31:48 | 3 | 1 |
| 1 | 2022-01-08 09:31:48 | 4 | 1 |

### Keep the control

If you don't want to use the Doctrine's `Paginator` to keep the control (or if you don't find logical to use a _paginator_ to fetch only 1 entity), then you can use 2 separate SQL queries:

```php {7,9-12,14,17}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->addSelect('pictures')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addOrderBy('pet.createdAt', 'asc');
    // ^ we removed the usage of `->setMaxResults(1)` here

// Clone the previous QueryBuilder, we only select the identifier
$qbId = (clone $qb)
    ->select('pet.id')
    ->setMaxResults(1); // select 1 result

// Then we use the previously fetched identifier
$pet = $qb
    ->andWhere('pet.id = :id')
    ->setParameter('id', $qbId->getQuery()->getSingleScalarResult())
    ->getQuery()
    ->getSingleResult();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "4"
```

And if you need to fetch multiple results:

```php {7,9-12,14,17}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->addSelect('pictures')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addOrderBy('pet.createdAt', 'asc');
    // ^ we removed the usage of `->setMaxResults(1)` here

// Clone the previous QueryBuilder, we only select the identifiers
$qbId = (clone $qb)
    ->select('pet.id')
    ->setMaxResults(2); // select 2 results

// Then we use the previously fetched identifiers
$pets = $qb
    ->andWhere('pet.id IN (:id)')
    ->setParameter('id', array_column($qbId->getQuery()->getScalarResult(), 'id'));
    ->getQuery()
    ->getResult();

echo $pets[0]->getId(); // outputs "1"
echo count($pets[0]->getPictures()); // outputs "4"

echo $pets[1]->getId(); // outputs "2"
echo count($pets[1]->getPictures()); // outputs "2"
```

::: tip
Even if it looks like a good idea to keep the control, [@Ocramius](https://twitter.com/Ocramius) recommends to use the Doctrine's `Paginator`:

<ClientOnly>
    <blockquote class="twitter-tweet" data-conversation="none" data-dnt="true" data-theme="light"><p lang="en" dir="ltr">What&#39;s important is that:<br><br> * if you do a fetch-join, **DO** use the paginator<br> * if you don&#39;t do a fetch-join, setMaxResults() should suffice</p>&mdash; `replaces: *` (@Ocramius) <a href="https://twitter.com/Ocramius/status/1478684768288059392?ref_src=twsrc%5Etfw">January 5, 2022</a></blockquote>
</ClientOnly>

:::
