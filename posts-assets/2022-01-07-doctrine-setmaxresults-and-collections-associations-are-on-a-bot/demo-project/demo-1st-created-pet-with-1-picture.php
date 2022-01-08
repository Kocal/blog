<?php

use App\Core\Entity\Pet;
use Webmozart\Assert\Assert;

require_once __DIR__."/vendor/autoload.php";

/** @var \Doctrine\ORM\EntityManagerInterface $entityManager */
$entityManager = require_once __DIR__.'/doctrine/bootstrap.php';

// Get the last created pet

$qb = $entityManager->createQueryBuilder()
    ->select('pet')
    ->from(Pet::class, 'pet')
    ->leftJoin('pet.pictures', 'pictures')
    ->addSelect('pictures')
    ->addOrderBy('pet.createdAt', 'asc')
    ->setMaxResults(1);

$pet = $qb->getQuery()->getSingleResult();

Assert::isInstanceOf($pet, Pet::class);
Assert::same($pet->getId(), 1);
Assert::count($pet->getPictures(), 2, "Expected %d pictures to be fetched, but we got %d."); // It fails
