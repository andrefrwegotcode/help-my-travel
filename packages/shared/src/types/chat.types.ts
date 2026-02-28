export type ChatSender = 'customer' | 'staff';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  targetLanguage: string;
  timestamp: string;
}

export interface TranslateDto {
  text: string;
  fromLanguage: string;
  toLanguage: string;
}

export interface TranslateResponse {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
}
