<?php

use App\Core\Entity\Pet;
use Webmozart\Assert\Assert;

require_once __DIR__."/vendor/autoload.php";

/** @var \Doctrine\ORM\EntityManagerInterface $entityManager */
$entityManager = require_once __DIR__.'/doctrine/bootstrap.php';

// Get the first created pet

$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1)
;

// Then we use the fetched id
$paginator = new \Doctrine\ORM\Tools\Pagination\Paginator($qb->getQuery(), true);
$pet = $paginator->getIterator()->current();

Assert::isInstanceOf($pet, Pet::class);
Assert::same($pet->getId(), 1);
Assert::count($pet->getPictures(), 4);

echo "OK".PHP_EOL;

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
    ->andWhere('pet.id IN (:id)')
    ->setParameter('id', $qbId->getQuery()->getSingleScalarResult())
    ->getQuery()
    ->getOneOrNullResult();

Assert::isInstanceOf($pet, Pet::class);
Assert::same($pet->getId(), 1);
Assert::count($pet->getPictures(), 4);

echo "OK".PHP_EOL;
