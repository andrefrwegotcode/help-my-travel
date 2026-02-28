import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuDiscoveryProcessor, MENU_QUEUE } from './menu-discovery.processor';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: MENU_QUEUE }),
    PlacesModule,
  ],
  controllers: [MenuController],
  providers: [MenuService, MenuDiscoveryProcessor],
})
export class MenuModule {}
