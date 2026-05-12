import { MEDIOS_DE_PAGO } from '../constants/catalogos';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const buildPrompt = (medios) =>
  `Extraé datos de este ticket en JSON.
Formato:
{
  "precio": "total del ticket",
  "fecha": "DD/MM/YYYY",
  "medio": "uno de: ${medios.join(', ')}",
  "tipo": "debito o credito",
  "moneda": "ARS, USD, EUR o BRL",
  "cuotas": "cantidad",
  "objeto": "resumen Super, Farmacia, etc (máx 50 carac)",
  "items": [{ "objeto": "nombre del producto", "precio": "monto individual" }]
}
Respondé SOLO JSON. No inventes campos.`;

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
      model: 'openai/gpt-4o-mini',
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
  console.log('DEBUG OCR Response:', text);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }

  const result = {};
  const cleanPrice = (val) => {
    if (!val) return null;
    let s = String(val).replace(/\s/g, ''); // Quitar espacios
    // Si tiene puntos y comas, asumimos formato 1.234,56
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      // Si solo tiene coma, asumimos 1234,56
      s = s.replace(',', '.');
    }
    return s;
  };

  const rawPrecio = cleanPrice(parsed.precio || parsed.total || parsed.monto);
  if (rawPrecio && !isNaN(Number(rawPrecio))) result.precio = rawPrecio;
  
  if (parsed.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(parsed.fecha) && parsed.fecha !== 'DD/MM/YYYY') {
    result.fecha = parsed.fecha;
  }
  
  if (parsed.medio && medios.includes(parsed.medio)) result.medio = parsed.medio;
  if (parsed.tipo && ['debito', 'credito'].includes(parsed.tipo)) result.tipo = parsed.tipo;
  if (parsed.moneda && ['ARS', 'USD', 'EUR', 'BRL'].includes(parsed.moneda)) result.moneda = parsed.moneda;
  
  const rawCuotas = parsed.cuotas || parsed.installments;
  if (rawCuotas != null && !isNaN(parseInt(rawCuotas))) result.cuotas = String(parseInt(rawCuotas));
  
  if (parsed.objeto && typeof parsed.objeto === 'string') result.objeto = parsed.objeto.trim().slice(0, 60);
  
  if (Array.isArray(parsed.items)) {
    result.items = parsed.items
      .map(it => ({
        objeto: String(it.objeto || it.name || '').slice(0, 50),
        precio: cleanPrice(it.precio || it.price || it.amount)
      }))
      .filter(it => it.objeto && it.precio && !isNaN(Number(it.precio)));
  }

  return result;
}
