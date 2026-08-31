import { NextRequest, NextResponse } from 'next/server';
import { getOrGenerateJwt } from '@payai/facilitator';
import { toJsonSafe } from '@/lib/x402-helpers';

export async function POST(request: NextRequest) {
  const { paymentPayload, paymentRequirements } = await request.json();

  // get the url and headers for the facilitator
  const url = process.env.FACILITATOR_URL as `${string}://${string}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKeyId = process.env.PAYAI_API_KEY_ID;
  const apiKeySecret = process.env.PAYAI_API_KEY_SECRET;
  if (apiKeyId && apiKeySecret) {
    headers.Authorization = `Bearer ${await getOrGenerateJwt({ apiKeyId, apiKeySecret })}`;
  }

  // make the request to the facilitator
  const res = await fetch(`${url}/verify`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      x402Version: paymentPayload.x402Version,
      paymentPayload: toJsonSafe(paymentPayload),
      paymentRequirements: toJsonSafe(paymentRequirements),
    }),
  });

  // get the response from the facilitator
  const data = await res.json();

  // forward the response from the facilitator
  return NextResponse.json(data, { status: res.status });
}
