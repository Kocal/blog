<?php

use App\Core\Entity\Pet;
use Webmozart\Assert\Assert;

require_once __DIR__."/vendor/autoload.php";

/** @var \Doctrine\ORM\EntityManagerInterface $entityManager */
$entityManager = require_once __DIR__.'/doctrine/bootstrap.php';

// Get the last two created pets
$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'desc')
;

// Clone the previous QueryBuilder, select only the id of our last created pets
$qbId = (clone $qb)
    ->select('pet.id')
    ->groupBy('pet.id')
    ->setMaxResults(2);

// Then we use the fetched id
$qb
    ->andWhere('pet.id IN (:id)')
    ->setParameter('id', array_column($qbId->getQuery()->getScalarResult(), 'id'));

$pets = $qb->getQuery()->getResult();

Assert::isInstanceOf($pets[0], Pet::class);
Assert::same($pets[0]->getId(), 3);
Assert::count($pets[0]->getPictures(), 0);

Assert::isInstanceOf($pets[1], Pet::class);
Assert::same($pets[1]->getId(), 2);
Assert::count($pets[1]->getPictures(), 2);

echo "OK".PHP_EOL;
