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
     * @ORM\JoinColumn(onDelete="CASCADE", nullable=false)
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
