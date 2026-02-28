import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 } from '@google-cloud/translate';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly translateClient: v2.Translate;

  constructor() {
    this.translateClient = new v2.Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
  }

  async translate(text: string, fromLanguage: string, toLanguage: string) {
    if (!text?.trim()) throw new BadRequestException('Text cannot be empty');
    if (fromLanguage === toLanguage) {
      return { originalText: text, translatedText: text, fromLanguage, toLanguage };
    }

    try {
      const [translated] = await this.translateClient.translate(text, {
        from: fromLanguage,
        to: toLanguage,
      });

      return {
        originalText: text,
        translatedText: Array.isArray(translated) ? translated.join(' ') : translated,
        fromLanguage,
        toLanguage,
      };
    } catch (err) {
      this.logger.error('Translation failed', err);
      throw new BadRequestException('Translation service unavailable');
    }
  }

  async detectLanguage(text: string) {
    try {
      const [detections] = await this.translateClient.detect(text);
      const detection = Array.isArray(detections) ? detections[0] : detections;
      return { language: detection.language, confidence: detection.confidence };
    } catch {
      return { language: 'unknown', confidence: 0 };
    }
  }
}
