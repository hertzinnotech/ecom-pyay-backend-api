import { 
    Column, 
    Entity,
    BeforeInsert,
    Index,
    OneToMany,
    JoinColumn
} from "typeorm"; 
import { Entity as MedusaEntity } from "medusa-extender";
import { SoftDeletableEntity } from "@medusajs/medusa";
import { generateEntityId } from "@medusajs/medusa/dist/utils";
import { DeliveryArea } from "../delivery/entities/deliveryArea.entity";

@MedusaEntity()
@Entity()
export class PriceGroup extends SoftDeletableEntity{
    @Index({ unique: true })
    @Column()
    name: string;

    @Column({default: 0, nullable: false, type: "float"})
    price: number;

    @Column({type: "boolean", default: false})
    is_disabled: boolean;

    @OneToMany(() => DeliveryArea, (area: DeliveryArea) => area.priceGroup, {cascade: true})
    @JoinColumn({ name: 'id', referencedColumnName: 'pricing_id' })
    areas: DeliveryArea[];

    @BeforeInsert()
    private beforeInsert(): void {
        this.id = generateEntityId(this.id, "price");
    }
}
/**
 * @schema pricing_group
 * title: "PricingGroup"
 * description: "Represents a pricing group"
 * required:
 *   - name
 *   - price
 * properties:
 *   id:
 *     type: string
 *     description: The pricing_gropup's ID
 *     example: price_01G2SG30J8C85S4A5CHM2S1NS2
 *   name:
 *     type: string
 *     description: The pricing group's name
 *   price:
 *     type: Double
 *     description: The pricing group's price
 *   areas:
 *     type: array
 *     description: The pricing group's areas
 *     items:
 *          -
 *     
 * */