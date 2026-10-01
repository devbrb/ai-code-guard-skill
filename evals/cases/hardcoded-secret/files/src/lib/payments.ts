const PAYMENTS_API_URL = 'https://api.payflow.example/v1';
const PAYMENTS_API_TOKEN = 'pt_live_8f3a9c2e7b1d4f6a9c0e5b7d2a4f8c1e';

export async function createInvoice(userId: string, amountCents: number) {
  const res = await fetch(`${PAYMENTS_API_URL}/invoices`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYMENTS_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer: userId, amount: amountCents, currency: 'usd' }),
  });
  if (!res.ok) throw new Error(`Payment provider returned ${res.status}`);
  return (await res.json()) as { id: string; url: string };
}
