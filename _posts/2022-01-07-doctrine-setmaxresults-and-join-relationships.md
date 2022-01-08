---
title: "Doctrine, \"QueryBuilder::setMaxResults()\" and relationships are on a boat"
tags:
- php
- doctrine
- database
date: 2022-01-07
summary: What happens with your Doctrine relationships when using "QueryBuilder::setMaxResults()"?
---

Aujourd'hui on va parler des limitations de SGBD, Doctrine et `QueryBuilder::setMaxResults()`, quelque chose dont je me suis heurté en faisant de l'optimisation de requêtes SQL.
C'est quelque chose qui est documenté https://www.doctrine-project.org/projects/doctrine-orm/en/latest/reference/dql-doctrine-query-language.html#first-and-max-result-items-dql-query-only mais à mon avis assez méconnu.

## context 

On a 2 entités :
- `Pet`, contient 3 champs `id`, `pictures` (0 ou plusieurs `Picture`) et `createdAt`
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

- `Picture`, contient 3 champs `id`, `pet` (à 1 `Pet`)
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

Et une BDD seedée de manière à ce que :
- le 1er `Pet` possède 4 `Picture` 
- le 2ème `Pet` possède 2 `Picture` 
- le 3ème et dernier `Pet` possède 0 `Picture` 
```php
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

## le problème

Si on essaye de récupérer la dernière entité `Pet` créée en base de données, on va faire qlq chose comme ça :
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

`$pet` est bien un `Pet`, et possède 4 `Pictures`, en revanche on a une requête SQL supplémentaire qui s'exécute dès qu'on utilise `$pet->pictures()`. 

Pour éviter ce soucis N+1 il faut donc faire une jointure vers `pictures` : 

```php {4-5}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$pet = $qb->getQuery()->getSingleResult();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "1"... wait what?
```


Notre variable `$pet` contient notre dernier `Pet` créé, en revanche `$pet->getPictures()` ne retourne qu'1 `Picture` au lieu des 4 attendues, pourquoi ?

La requête SQL générée par Doctrine est la suivante :
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

le soucis proviens du `LIMIT 1`, on va récupérer un élément `Pet` et même temps initialiser à moitier nos `Pictures`: 

| id\_0 | created\_at\_1 | id\_2 | pet\_id\_3 |
| :--- | :--- | :--- | :--- |
| 1 | 2022-01-08 09:31:48 | 1 | 1 |

## contourner le problème 

Doctrine met à disposition une classe [`Paginator`](https://www.doctrine-project.org/projects/doctrine-orm/en/2.6/tutorials/pagination.html) qui s'utilise ainsi : 

```php {9-10}
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$paginator = new \Doctrine\ORM\Tools\Pagination\Paginator($qb->getQuery(), true);
$pet = $paginator->getIterator()->current();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "4"
```

de manière interne, le Paginator clône la Query passée et exécute 2 requêtes SQL :
1. récupérer un `id` : 
```sql
SELECT DISTINCT id_0
FROM (SELECT DISTINCT id_0, created_at_1
      FROM (SELECT a0_.id AS id_0, a0_.created_at AS created_at_1, a1_.id AS id_2, a1_.pet_id AS pet_id_3
            FROM adoption_pet a0_
                     LEFT JOIN adoption_pet_picture a1_ ON a0_.id = a1_.pet_id) dctrn_result_inner
      ORDER BY created_at_1 ASC) dctrn_result
LIMIT 1;
```
qui retourne : 
| id\_0 |
| :--- |
| 1 |

2. et 
```sql
SELECT a0_.id AS id_0, a0_.created_at AS created_at_1, a1_.id AS id_2, a1_.pet_id AS pet_id_3
FROM adoption_pet a0_
         LEFT JOIN adoption_pet_picture a1_ ON a0_.id = a1_.pet_id
WHERE a0_.id IN (?)
ORDER BY a0_.created_at ASC
```
qui retourne plusieurs lignes, notre Pet et nos 4 Pictures
| id\_0 | created\_at\_1 | id\_2 | pet\_id\_3 |
| :--- | :--- | :--- | :--- |
| 1 | 2022-01-08 09:31:48 | 1 | 1 |
| 1 | 2022-01-08 09:31:48 | 2 | 1 |
| 1 | 2022-01-08 09:31:48 | 3 | 1 |
| 1 | 2022-01-08 09:31:48 | 4 | 1 |

## keep the control 

si vous ne souhaitez garder le côntrole et ne pas utiliser le Paginator, surtout si vous ne trouvez pas ça logique pour 1 seul élément, il est possible de faire

```php 
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc');

// Clone the previous QueryBuilder, select only the id of our last created pet
$qbId = (clone $qb)
    ->select('pet.id')
    ->setMaxResults(1);

// Then we use the fetched id
$pet = $qb
    ->andWhere('pet.id = :id')
    ->setParameter('id', $qbId->getQuery()->getSingleScalarResult())
    ->getQuery()
    ->getOneOrNullResult();

echo $pet->getId(); // outputs "1"
echo count($pet->getPictures()); // outputs "4"
```

si vous souhaitez récupérer plusieurs éléments : 
```php 
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc');

// Clone the previous QueryBuilder, select only the id of our last created pet
$qbId = (clone $qb)
    ->select('pet.id')
    ->setMaxResults(2); // get 2 pets

$qb
    ->andWhere('pet.id IN (:id)')
    ->setParameter('id', array_column($qbId->getQuery()->getScalarResult(), 'id'));

$pets = $qb->getQuery()->getResult();

echo $pets[0]->getId(); // outputs "1"
echo count($pets[0]->getPictures()); // outputs "4"

echo $pets[1]->getId(); // outputs "2"
echo count($pets[1]->getPictures()); // outputs "2"
```
