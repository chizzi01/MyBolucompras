// src/services/notificaciones/parseIA.js
// Fallback de parseo cuando ninguna plantilla de reglas matchea. Mismo
// proveedor que ocrService.js (OpenRouter), pero sobre texto en vez de imagen.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PROMPT = `Extraé los datos de esta notificación de una app de banco o billetera virtual argentina. Es una notificación de una COMPRA con tarjeta (no un resumen de cuenta, ni un envío/recepción de dinero, ni una promoción).
Devolvé SOLO este JSON, sin texto adicional ni markdown:
{
  "monto": "número sin símbolo de moneda, con punto como separador decimal (ej 12000 o 1234.56)",
  "comercio_raw": "nombre del comercio tal cual aparece en el texto",
  "medio": "Visa, Mastercard, American Express u otro medio mencionado, o null si no aparece",
  "tipo": "debito o credito si se menciona, o null si no aparece",
  "ultimos4": "últimos 4 dígitos de la tarjeta si aparecen, o null",
  "moneda": "ARS, USD u otra si se menciona explícitamente, sino ARS"
}
Si el texto NO es una notificación de compra, respondé exactamente: {"esCompra": false}`;

async function parseConIA(titulo, texto, apiKey) {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mybolucompras.app',
        'X-Title': 'Budget Buddy',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'user', content: `${PROMPT}\n\nTítulo: ${titulo}\nTexto: ${texto}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.log('[parseIA] respuesta HTTP no-ok:', response.status, body);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    console.log('[parseIA] respuesta del modelo:', text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }

    if (parsed.esCompra === false || parsed.monto == null) return null;

    return {
      monto: Number(parsed.monto) || 0,
      moneda: parsed.moneda || 'ARS',
      comercio_raw: parsed.comercio_raw || null,
      medio: parsed.medio || null,
      tipo: parsed.tipo || null,
      ultimos4: parsed.ultimos4 || null,
    };
  } catch (err) {
    console.log('[parseIA] excepción durante el fetch:', err?.message ?? err);
    return null;
  }
}

module.exports = { parseConIA };
