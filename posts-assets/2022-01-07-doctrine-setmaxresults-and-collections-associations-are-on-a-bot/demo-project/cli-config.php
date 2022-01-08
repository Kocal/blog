<?php
// cli-config.php
$entityManager = require_once __DIR__ . "/doctrine/bootstrap.php";

return \Doctrine\ORM\Tools\Console\ConsoleRunner::createHelperSet($entityManager);
