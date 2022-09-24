import { validator } from "@medusajs/medusa/dist/utils/validator";
import { AuthenticationService } from "../services/authentication.service";
import { EntityManager } from "typeorm";
import jwt from "jsonwebtoken";
import { CustomerService } from "../../customer/v1/services/customer.service";
import {  IsNotEmpty } from "class-validator";

export default async (req, res) => {
  console.log("login customer controller");
    const validated = await validator(StorePostAuthReq, req.body)
  
    //const authService: MyAuthService = req.scope.resolve("myService");
    const authService: AuthenticationService = req.scope.resolve(AuthenticationService.resolutionKey);
    const manager: EntityManager = req.scope.resolve("manager");
    const result = await manager.transaction(async (transactionManager) => {
      return await authService
        .withTransaction(transactionManager)
        .authenticateCustomer(validated.login_info, validated.password)
    })
  
    if (!result.success) {
      res.sendStatus(401)
      return
    }
  
    // Add JWT to cookie
    const {
      projectConfig: { jwt_secret },
    } = req.scope.resolve("configModule")
    req.session.jwt = jwt.sign(
      { customer_id: result.customer?.id },
      jwt_secret!,
      {
        expiresIn: "30d",
      }
    )
  
    const customerService: CustomerService = req.scope.resolve("customerService")
    const customer = await customerService.retrieve(result.customer?.id || "", {
      relations: ["orders", "orders.items"],
    })
  
    res.json({ customer })
  }
  export class StorePostAuthReq {
    @IsNotEmpty()
    login_info: string
  
    @IsNotEmpty()
    password: string
  }