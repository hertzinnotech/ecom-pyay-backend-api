import { DiscountConditionOperator } from "@medusajs/medusa/dist/models/discount-condition";
import { IsOptional, IsString } from "class-validator"
import { defaultAdminDiscountsFields, defaultAdminDiscountsRelations } from "../routers/discount.router";
import { Discount } from "../entities/discount.entity"
import { AdminUpsertConditionsReq } from "../types/discount"
//import DiscountConditionService from "@medusajs/medusa/dist/services/discount-condition"
import {DiscountConditionService} from "../services/discountCondition.service";
import { DiscountService } from "../services/discount.service"
import { EntityManager } from "typeorm"
import { getRetrieveConfig } from "@medusajs/medusa/dist/utils/get-query-config"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [post] /admin/v1/discounts/{discount_id}/conditions
 * operationId: "PostDiscountsDiscountConditions"
 * summary: "Create a Condition"
 * description: "Creates a DiscountCondition. Only one of `products`, `product_types`, `product_collections`, `product_tags`, and `customer_groups` should be provided."
 * x-authenticated: true
 * parameters:
 *   - (path) discount_id=* {string} The ID of the Product.
 *   - (query) expand {string} (Comma separated) Which fields should be expanded in each product of the result.
 *   - (query) fields {string} (Comma separated) Which fields should be included in each product of the result.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         required:
 *           - operator
 *         properties:
 *           operator:
 *              description: Operator of the condition
 *              type: string
 *              enum: [in, not_in]
 *           products:
 *              type: array
 *              description: list of product IDs if the condition is applied on products.
 *              items:
 *                type: string
 *           product_types:
 *              type: array
 *              description: list of product type IDs if the condition is applied on product types.
 *              items:
 *                type: string
 *           product_collections:
 *              type: array
 *              description: list of product collection IDs if the condition is applied on product collections.
 *              items:
 *                type: string
 *           product_tags:
 *              type: array
 *              description: list of product tag IDs if the condition is applied on product tags.
 *              items:
 *                type: string
 *           customer_groups:
 *              type: array
 *              description: list of customer group IDs if the condition is applied on customer groups.
 *              items:
 *                type: string
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       import { DiscountConditionOperator } from "@medusajs/medusa"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.discounts.createCondition(discount_id, {
 *         operator: DiscountConditionOperator.IN
 *       })
 *       .then(({ discount }) => {
 *         console.log(discount.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/discounts/{id}/conditions' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "operator": "in"
 *       }'
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 * tags:
 *   - Discount Condition
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           properties:
 *             discount:
 *               $ref: "#/components/schemas/discount"
 *   "400":
 *     $ref: "#/components/responses/400_error"
 *   "401":
 *     $ref: "#/components/responses/unauthorized"
 *   "404":
 *     $ref: "#/components/responses/not_found_error"
 *   "409":
 *     $ref: "#/components/responses/invalid_state_error"
 *   "422":
 *     $ref: "#/components/responses/invalid_request_error"
 *   "500":
 *     $ref: "#/components/responses/500_error"
 */
export default async (req, res) => {
  const { discount_id } = req.params

  const validatedCondition = await validator(
    AdminPostDiscountsDiscountConditions,
    req.body
  )

  const validatedParams = await validator(
    AdminPostDiscountsDiscountConditionsParams,
    req.query
  )

  const conditionService: DiscountConditionService = req.scope.resolve(
   DiscountConditionService.resolutionKey
  );
  const discountService: DiscountService = req.scope.resolve(DiscountService.resolutionKey);

  let discount = await discountService.retrieve(discount_id)

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await conditionService
      .withTransaction(transactionManager)
      .upsertCondition({
        ...validatedCondition,
        rule_id: discount.rule_id,
      })
  })

  const config = getRetrieveConfig<Discount>(
    defaultAdminDiscountsFields,
    defaultAdminDiscountsRelations,
    validatedParams?.fields?.split(",") as (keyof Discount)[],
    validatedParams?.expand?.split(",")
  )

  discount = await discountService.retrieve(discount.id, config)

  res.status(200).json({ discount })
}

// eslint-disable-next-line max-len
export class AdminPostDiscountsDiscountConditions extends AdminUpsertConditionsReq {
  @IsString()
  operator: DiscountConditionOperator
}

export class AdminPostDiscountsDiscountConditionsParams {
  @IsString()
  @IsOptional()
  expand?: string

  @IsString()
  @IsOptional()
  fields?: string
}