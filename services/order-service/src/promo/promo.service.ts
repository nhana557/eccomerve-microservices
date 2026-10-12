import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PromoEntity } from './entities/promo.entity';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(PromoEntity)
    private readonly promoRepo: Repository<PromoEntity>,
  ) {}

  async listActive(): Promise<PromoEntity[]> {
    return this.promoRepo.find({
      where: {
        valid_until: MoreThan(new Date()),
        quota: MoreThan(0),
      },
    });
  }

  async getByCode(code: string): Promise<PromoEntity | null> {
    const cleanCode = code.trim().toUpperCase();
    return this.promoRepo
      .createQueryBuilder('promo')
      .where('UPPER(promo.code) = :code', { code: cleanCode })
      .getOne();
  }

  async validatePromo(dto: ValidatePromoDto) {
    if (!dto.code || !dto.code.trim()) {
      throw new BadRequestException('Kode promo wajib diisi');
    }

    const promo = await this.getByCode(dto.code);
    if (!promo) {
      throw new NotFoundException('Kode promo tidak ditemukan');
    }

    const now = new Date();
    if (now > promo.valid_until || promo.quota <= 0) {
      throw new BadRequestException('Kupon promo telah kedaluwarsa atau kuota habis');
    }

    const subtotal = Number(dto.subtotal) || 0;
    if (subtotal < Number(promo.min_purchase)) {
      throw new BadRequestException('Total belanja belum memenuhi syarat minimum promo');
    }

    let discountAmount = 0;
    if (promo.discount_type === 'PERCENTAGE') {
      discountAmount = Math.floor((subtotal * Number(promo.discount_value)) / 100);
      if (promo.max_discount > 0 && discountAmount > Number(promo.max_discount)) {
        discountAmount = Number(promo.max_discount);
      }
    } else {
      discountAmount = Number(promo.discount_value);
    }

    return {
      is_valid: true,
      discount_amount: discountAmount,
      promo,
    };
  }
}
