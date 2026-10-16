import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoEntity } from '../../promo/entities/promo.entity';

@Injectable()
export class PromoSeeder implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(PromoEntity)
    private readonly promoRepo: Repository<PromoEntity>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const defaults = [
        {
          id: 'promo-tokopedia20',
          code: 'TOKOPEDIA20',
          title: 'Diskon 20% Pengguna Baru & Setia',
          discount_type: 'PERCENTAGE' as const,
          discount_value: 20,
          min_purchase: 200000,
          max_discount: 150000,
          quota: 1000,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'promo-hemat50',
          code: 'HEMAT50',
          title: 'Hemat Rp 50.000 Belanja Gadget',
          discount_type: 'FIXED' as const,
          discount_value: 50000,
          min_purchase: 300000,
          max_discount: 50000,
          quota: 500,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'promo-bebasongkir',
          code: 'BEBASONGKIR',
          title: 'Diskon Ongkos Kirim Rp 20.000',
          discount_type: 'FIXED' as const,
          discount_value: 20000,
          min_purchase: 100000,
          max_discount: 20000,
          quota: 2000,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const p of defaults) {
        const existing = await this.promoRepo.findOne({ where: { code: p.code } });
        if (!existing) {
          await this.promoRepo.save(this.promoRepo.create(p));
        }
      }
    } catch (err: any) {
      console.warn('[PromoSeeder] Could not seed default promos:', err?.message);
    }
  }
}
