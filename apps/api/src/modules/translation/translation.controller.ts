import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { TranslateDto } from './dto/translate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('translation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('translation')
export class TranslationController {
  constructor(private translationService: TranslationService) {}

  @Post('translate')
  @ApiOperation({
    summary: 'Translate text bidirectionally (customer ↔ staff)',
    description: 'Used in the communication screen. Translates text between customer language and restaurant local language.',
  })
  async translate(@Body() dto: TranslateDto) {
    return this.translationService.translate(dto.text, dto.fromLanguage, dto.toLanguage);
  }
}
