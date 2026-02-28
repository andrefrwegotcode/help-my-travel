import { Injectable } from '@nestjs/common';
import { v2 } from '@google-cloud/translate';
import type { OrderRequest, OrderResponse } from '@helpmytravel/shared';

@Injectable()
export class OrderService {
  private readonly translateClient: v2.Translate;

  constructor() {
    this.translateClient = new v2.Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
  }

  async generateOrder(request: OrderRequest): Promise<OrderResponse> {
    const { items, placeName, placeLanguage, tableNumber, notes } = request;

    // Build order items
    const orderItems = items.map((item) => {
      const subtotal =
        item.menuItem.priceValue && item.quantity
          ? (item.menuItem.priceValue * item.quantity).toFixed(2)
          : null;
      return {
        name: item.menuItem.nameOriginal || item.menuItem.name,
        nameTranslated: item.menuItem.name,
        quantity: item.quantity,
        price: item.menuItem.price,
        subtotal: subtotal
          ? `${item.menuItem.currency || ''}${subtotal}`
          : null,
        priceValue: item.menuItem.priceValue,
      };
    });

    // Calculate total
    const totalValue = orderItems.reduce((sum, item) => {
      return sum + (item.priceValue ? item.priceValue * item.quantity : 0);
    }, 0);

    const currency = items[0]?.menuItem.currency || '';
    const totalStr = totalValue > 0 ? `${currency}${totalValue.toFixed(2)}` : null;

    // Build order text in the restaurant's local language
    const orderLines = [
      tableNumber ? `Table: ${tableNumber}` : null,
      `\nOrder:`,
      ...orderItems.map((item) => `  ${item.quantity}x ${item.name}${item.price ? ` - ${item.price}` : ''}`),
      totalStr ? `\nTotal: ${totalStr}` : null,
      notes ? `\nNotes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    // Translate order text to restaurant's local language
    let localOrderText = orderLines;
    try {
      const [translated] = await this.translateClient.translate(orderLines, placeLanguage);
      localOrderText = Array.isArray(translated) ? translated.join('\n') : translated;
    } catch {
      // Fallback to original if translation fails
    }

    return {
      orderText: localOrderText,
      items: orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price || null,
        subtotal: item.subtotal,
      })),
      total: totalStr,
    };
  }
}
