import { MigrationInterface, QueryRunner } from 'typeorm';
export default class addStoreIdToUser1644946220401 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
