import express = require('express');
const config = require('../medusa-config');
import { Medusa } from 'medusa-extender';
import { resolve } from 'path';
import { ExampleModule } from './modules/example/example.module';
import { StoreModule } from './modules/store/store.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { InviteModule } from './modules/invite/invite.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { CustomerModule } from './modules/customer/customer.module';
async function bootstrap() {
    const expressInstance = express();
    
    await new Medusa(resolve(__dirname, '..'), expressInstance).load([
        ExampleModule,
        StoreModule,
        ProductModule,
        OrderModule,
        InviteModule,
        RoleModule,
        PermissionModule,
        UserModule,
        CustomerModule
    ]);
    
    const port = config?.serverConfig?.port ?? 9000;
    expressInstance.listen(port, () => {
        console.info('Server successfully started on port ' + port);
    });
}

bootstrap();