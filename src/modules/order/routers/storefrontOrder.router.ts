import { Router } from 'medusa-extender';
import middlewares from '@medusajs/medusa/dist/api/middlewares';
import { Order } from '../entities/order.entity';
import getOrderByCart from '../handlers/storefront/get-order-by-cart';
import getOrder from '../handlers/storefront/get-order';
import lookUpOrder from '../handlers/storefront/look-up-order';
import makeOrderPayment from '../handlers/storefront/make-order-payment';

@Router({
    routes: 
    [
        /**
         * Retrieves an Order by the id of the Cart that was used to create the Order.
         */
         {
            requiredAuth: false,
            path: '/store/v1/orders/cart/:cart_id',
            method: 'get',
            handlers: [
                middlewares.wrap(getOrderByCart)
            ],
        },
        /**
         * Retrieves an Order by the id.
         */
         {
            requiredAuth: false,
            path: '/store/v1/orders/:id',
            method: 'get',
            handlers: [
                middlewares.wrap(getOrder)
            ],
        },
        /**
         * Look up an order using filters.
         */
         {
            requiredAuth: false,
            path: '/store/v1/orders',
            method: 'get',
            handlers: [
                middlewares.wrap(lookUpOrder)
            ],
        },
        /**
         * Create prepaid payment data
         */
         {
            requiredAuth: true,
            path: '/store/v1/orders/:id/prepaid',
            method: 'post',
            handlers: [
                middlewares.authenticate(),
                middlewares.wrap(makeOrderPayment)
            ],
        },
    ] 
})
export class StorefrontOrderRouter {}

export const defaultStoreOrdersFields = [
    "id",
    "status",
    "fulfillment_status",
    "payment_status",
    "display_id",
    "cart_id",
    "customer_id",
    "email",
    "region_id",
    "currency_code",
    "tax_rate",
    "created_at",
    "shipping_total",
    "discount_total",
    "tax_total",
    "items.refundable",
    "refunded_total",
    "gift_card_total",
    "subtotal",
    "total",
  ] as (keyof Order)[]

  export const defaultStoreOrdersRelations = [
    "shipping_address",
    "fulfillments",
    "fulfillments.tracking_links",
    "items",
    "items.variant",
    "items.variant.product",
    "shipping_methods",
    "discounts",
    "discounts.rule",
    "customer",
    "payments",
    "region",
  ]
  
  