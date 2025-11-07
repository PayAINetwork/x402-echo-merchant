import { NextResponse } from 'next/server';
import { renderRizzlerHtml } from '@/lib/utils';

// a basic GET route, actual response is produced in middleware
export const GET = async (request: Request) => {
  // Check if this request has payment info (indicating successful payment)
  const paymentResponseHeader = request.headers.get('x-payment-response');
  
  console.log('Route handler - x-payment-response header:', paymentResponseHeader);
  
  if (paymentResponseHeader) {
    // Fallback: generate success HTML if middleware didn't handle it
    try {
      const paymentInfo = JSON.parse(atob(paymentResponseHeader));
      
      console.log('Route handler - parsed payment info:', JSON.stringify(paymentInfo, null, 2));
      
      const html = renderRizzlerHtml({
        transaction: paymentInfo.transaction || 'N/A',
        network: paymentInfo.network || 'solana',
        payer: paymentInfo.payer || 'N/A'
      });
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch {
      // If parsing fails, return empty response
      return new NextResponse('', { status: 200 });
    }
  }

  // No payment info, return the paywall requirement

  return NextResponse.json({ ok: true });
};