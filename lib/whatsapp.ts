export interface WhatsappConfig {
  provider: 'console' | 'twilio' | 'zapi' | 'meta';
  apiUrl?: string;
  apiToken?: string;
  fromNumber?: string;
}

export interface WhatsappSendResult {
  ok: boolean;
  error?: string;
}

/**
 * Adapter simples e abstrato de envio de WhatsApp. A lógica de negócio (o que
 * enviar e quando) não conhece o provedor concreto — apenas chama sendWhatsapp.
 * Trocar de provedor (Twilio, Z-API, Meta Cloud API) exige mudar somente aqui.
 */
export async function sendWhatsapp(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string
): Promise<WhatsappSendResult> {
  try {
    switch (config.provider) {
      case 'twilio':
        return await sendViaTwilio(config, telefone, mensagem);
      case 'zapi':
        return await sendViaZApi(config, telefone, mensagem);
      case 'meta':
        return await sendViaMetaCloud(config, telefone, mensagem);
      case 'console':
      default:
        console.log(`[whatsapp:console] para ${telefone}: ${mensagem}`);
        return { ok: true };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendViaTwilio(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string
): Promise<WhatsappSendResult> {
  if (!config.apiUrl || !config.apiToken || !config.fromNumber) {
    return { ok: false, error: 'Configuração Twilio incompleta' };
  }

  const body = new URLSearchParams({
    To: `whatsapp:${telefone}`,
    From: `whatsapp:${config.fromNumber}`,
    Body: mensagem,
  });

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${config.apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    return { ok: false, error: `Twilio respondeu ${res.status}` };
  }
  return { ok: true };
}

async function sendViaZApi(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string
): Promise<WhatsappSendResult> {
  if (!config.apiUrl || !config.apiToken) {
    return { ok: false, error: 'Configuração Z-API incompleta' };
  }

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': config.apiToken,
    },
    body: JSON.stringify({ phone: telefone, message: mensagem }),
  });

  if (!res.ok) {
    return { ok: false, error: `Z-API respondeu ${res.status}` };
  }
  return { ok: true };
}

async function sendViaMetaCloud(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string
): Promise<WhatsappSendResult> {
  if (!config.apiUrl || !config.apiToken) {
    return { ok: false, error: 'Configuração Meta Cloud API incompleta' };
  }

  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: mensagem },
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `Meta Cloud API respondeu ${res.status}` };
  }
  return { ok: true };
}

export function whatsappConfigFromEnv(env: Record<string, string | undefined>): WhatsappConfig {
  return {
    provider: (env.WHATSAPP_PROVIDER as WhatsappConfig['provider']) || 'console',
    apiUrl: env.WHATSAPP_API_URL,
    apiToken: env.WHATSAPP_API_TOKEN,
    fromNumber: env.WHATSAPP_FROM_NUMBER,
  };
}
