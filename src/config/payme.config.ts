import { registerAs } from '@nestjs/config';

export default registerAs('payme', () => ({
  merchantId: process.env.PAYME_MERCHANT_ID || '',
  secretKey: process.env.PAYME_SECRET_KEY || '',
  testSecretKey: process.env.PAYME_TEST_SECRET_KEY || '',
  checkoutUrl: process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz',
  isTest: process.env.NODE_ENV !== 'production',
}));
