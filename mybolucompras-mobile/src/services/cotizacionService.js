const DOLAR_API_URL = 'https://dolarapi.com/v1/dolares/blue';

export const cotizacionService = {
  async getDolarBlue() {
    const response = await fetch(DOLAR_API_URL);
    if (!response.ok) throw new Error('No se pudo obtener la cotización del dólar');
    const data = await response.json();
    return data.venta;
  },
};
