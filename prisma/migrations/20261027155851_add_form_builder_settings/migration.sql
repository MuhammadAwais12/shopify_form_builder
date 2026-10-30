-- AlterTable
ALTER TABLE `field` ADD COLUMN `placeholder` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `form` ADD COLUMN `submitButtonText` VARCHAR(191) NOT NULL DEFAULT 'Submit',
    ADD COLUMN `successMessage` VARCHAR(191) NOT NULL DEFAULT 'Thanks! Your response was received.';
