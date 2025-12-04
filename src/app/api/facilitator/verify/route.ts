import { NextRequest, NextResponse } from 'next/server';
import { toJsonSafe } from "@payai/x402/shared";

export async function POST(request: NextRequest) {
  const { paymentPayload, paymentRequirements } = await request.json();

  // get the url and headers for the facilitator
  const url = process.env.FACILITATOR_URL as `${string}://${string}`;
  const headers = {'Content-Type': 'application/json'};

  // make the request to the facilitator
  const res = await fetch(`${url}/verify`, {
    method: "POST",
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