<?php

use App\Core\Entity\Pet;
use App\Core\Entity\Picture;

require_once __DIR__."/../vendor/autoload.php";

$entityManager = require_once __DIR__.'/bootstrap.php';

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

echo "All pets and pictures have been persisted!".PHP_EOL;
