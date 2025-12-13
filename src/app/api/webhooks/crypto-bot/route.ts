import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSettings } from '@/lib/settings';
import { getPayment, addToUserBalance } from '@/lib/db';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('crypto-pay-api-signature');
    const settings = await getSettings();

    if (!settings.cryptoBotToken) {
       return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }
    
    // Verify signature
    // Official method from their help:
    // signature = HMAC-SHA256(body, SHA256(api_token))
    const secret = crypto.createHash('sha256').update(settings.cryptoBotToken).digest();
    const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(bodyText)
        .digest('hex');
    
    if (!signature || signature !== computedSignature) {
         console.error('Invalid signature', { received: signature, computed: computedSignature });
         return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const body = JSON.parse(bodyText);

    if (body.update_type === 'invoice_paid') {
      const invoice = body.payload;
      const paymentId = invoice.invoice_id.toString();

      const updated = await prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: 'pending',
        },
        data: {
          status: 'paid',
        },
      });

      if (updated.count > 0) {
        const payment = await getPayment(paymentId);
        if (payment) {
          await addToUserBalance(payment.userId, payment.amount);
          console.log(`Success deposit: ${payment.amount} to user ${payment.userId}`);
        }
      } else {
        console.log('Invoice already processed or not found');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
