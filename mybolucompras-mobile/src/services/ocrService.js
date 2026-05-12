import { MEDIOS_DE_PAGO } from '../constants/catalogos';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const buildPrompt = (medios) =>
  `Analizá esta imagen de ticket o factura y extraé los datos en JSON. Solo incluí los campos que estén claramente visibles.

Formato esperado:
{
  "precio": "monto total como string numérico (ej: '1500.50')",
  "fecha": "fecha en formato DD/MM/YYYY",
  "medio": "exactamente uno de estos: ${medios.join(', ')}",
  "tipo": "debito o credito",
  "moneda": "ARS, USD, EUR o BRL",
  "cuotas": "cantidad de cuotas como string (ej: '3')",
  "objeto": "descripción breve de la compra, máximo 50 caracteres"
}

Respondé SOLO con el JSON puro, sin markdown ni texto adicional.`;

export async function scanReceiptWithAI(base64Image, apiKey, mediosHabilitados) {
  const medios = mediosHabilitados?.length > 0 ? mediosHabilitados : MEDIOS_DE_PAGO;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://mybolucompras.app', // Opcional para OpenRouter
      'X-Title': 'MyBolucompras', // Opcional para OpenRouter
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt(medios) },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('OpenRouter Error:', err);
    throw new Error(err?.error?.message || `Error ${response.status} al llamar a OpenRouter`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }

  const result = {};
  if (parsed.precio != null && !isNaN(Number(parsed.precio))) result.precio = String(parsed.precio);
  if (parsed.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(parsed.fecha)) result.fecha = parsed.fecha;
  if (parsed.medio && medios.includes(parsed.medio)) result.medio = parsed.medio;
  if (parsed.tipo && ['debito', 'credito'].includes(parsed.tipo)) result.tipo = parsed.tipo;
  if (parsed.moneda && ['ARS', 'USD', 'EUR', 'BRL'].includes(parsed.moneda)) result.moneda = parsed.moneda;
  if (parsed.cuotas != null && !isNaN(parseInt(parsed.cuotas))) result.cuotas = String(parseInt(parsed.cuotas));
  if (parsed.objeto && typeof parsed.objeto === 'string') result.objeto = parsed.objeto.trim().slice(0, 60);

  return result;
}
