import {  Router } from 'medusa-extender';
import wrapHandler from '@medusajs/medusa/dist/api/middlewares/await-middleware';
import middlewares, {
    transformBody,
    transformQuery,
  } from '@medusajs/medusa/dist/api/middlewares';
import createPricingGroup from './handlers/create-pricing-group';
import getPricingGroup from './handlers/get-pricing-group';

import {AdminPostPriceGroupReq} from './handlers/create-pricing-group';

@Router({
    routes: [
        {
            requiredAuth: true,
            path: '/v1/admin/pricing-groups',
            method: 'post',
            handlers: [
                transformBody(AdminPostPriceGroupReq),
                middlewares.authenticate(), // authentication is required
                middlewares.wrap(createPricingGroup)
            ],
        },
        {
            requiredAuth: true,
            path: '/v1/admin/pricing-groups/:id',
            method: 'get',
            handlers: [
                middlewares.authenticate(), // authentication is required
                middlewares.wrap(getPricingGroup)
            ],
        },
    ] 
})
export class PriceGroupRouter {}