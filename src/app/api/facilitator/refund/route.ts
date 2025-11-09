import { NextRequest, NextResponse } from 'next/server';
import { refund } from '../../../../refund';

export const runtime = 'nodejs';

export const POST = async (request: NextRequest) => {
  try {
    const { recipient, selectedPaymentRequirements } = await request.json();
    if (!recipient || !selectedPaymentRequirements) {
      return NextResponse.json({ error: 'Missing recipient or payment requirements' }, { status: 400 });
    }

    const refundTxHash = await refund(recipient, selectedPaymentRequirements);
    return NextResponse.json({ refundTxHash });
  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 });
  }
};


