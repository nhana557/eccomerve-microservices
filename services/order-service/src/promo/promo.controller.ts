import { Controller, Get, Post, Body } from '@nestjs/common';
import { PromoService } from './promo.service';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@Controller('api/v1/promos')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  async listPromos() {
    const promos = await this.promoService.listActive();
    return { promos };
  }

  @Post('validate')
  async validatePromo(@Body() dto: ValidatePromoDto) {
    return this.promoService.validatePromo(dto);
  }
}
