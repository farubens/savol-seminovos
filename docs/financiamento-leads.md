# Leads de financiamento

Este fluxo atende os leads gerados em "Simule seu financiamento".

## Como funciona

1. O front envia o lead para `POST /api/financiamento-leads`.
2. A API valida os dados e cria um protocolo `SAVOL-FIN-YYYYMMDD-000000`.
3. O lead e registrado na base interna Savol.
4. A mesma API tambem envia o lead para o Leadmob, mantendo empresa, departamento, origem, veiculo, UTM e metadados.

A base interna Savol fica como registro proprio dos leads de financiamento, e o Leadmob continua recebendo o lead comercial.

## Variaveis de ambiente

No projeto local, use `.env.local`. Na Vercel, use Project Settings > Environment Variables.

```env
LEADMOB_USERNAME=usuario_do_leadmob
LEADMOB_PASSWORD=senha_do_leadmob
SAVOL_FINANCE_LEADS_TOKEN=token_da_base_interna_savol
SAVOL_VOLKS_LEADS_TOKEN=token_privado_para_o_banco_volks
SAVOL_VOLKS_LEADS_SIGNING_SECRET=segredo_hmac_para_assinar_payloads
```

Observacoes:

- `LEADMOB_USERNAME` e `LEADMOB_PASSWORD` sao usados somente no servidor.
- `SAVOL_FINANCE_LEADS_TOKEN` protege o registro na base interna Savol.
- `SAVOL_VOLKS_LEADS_TOKEN` autentica o endpoint externo documentado para o Banco Volks.
- `SAVOL_VOLKS_LEADS_SIGNING_SECRET` valida a assinatura HMAC-SHA256 do payload enviado pelo Banco Volks.
- Nao use `NEXT_PUBLIC_` para essas variaveis.

## Endpoint do front

O front deve chamar somente:

```http
POST /api/financiamento-leads
Content-Type: application/json
```

A resposta inclui:

- `ok`
- `protocol`
- `leadmob`
- `request`, que e o payload final enviado ao Leadmob para facilitar debug no console do Chrome.

## Endpoint externo Banco Volks

Documentacao publica:

```text
https://www.savolseminovos.com.br/documentacao/banco-volks
```

Endpoint tecnico:

```http
POST /api/integracoes/banco-volks/leads
Authorization: Bearer TOKEN_PRIVADO
X-Savol-Timestamp: UNIX_TIMESTAMP
X-Savol-Signature: sha256=HMAC_SHA256
Content-Type: application/json
```

O token privado deve ser o mesmo valor configurado na Vercel em `SAVOL_VOLKS_LEADS_TOKEN`.
A assinatura deve ser gerada com `SAVOL_VOLKS_LEADS_SIGNING_SECRET` sobre:

```text
timestamp + "." + corpo_json_bruto
```

Controles aplicados:

- Bearer token obrigatorio.
- Assinatura HMAC-SHA256 obrigatoria.
- Timestamp obrigatorio com janela maxima de 5 minutos.
- Payload limitado a 128KB.
- Content-Type obrigatorio `application/json`.

Resposta publica esperada:

```json
{
  "ok": true,
  "protocol": "SAVOL-FIN-20260623-123456",
  "status": "received"
}
```

## Payload recomendado

```json
{
  "name": "Cliente Teste",
  "phone": "11999999999",
  "email": "cliente@email.com",
  "cpf": "12345678910",
  "unitName": "SAVOL TOYOTA - SAO BERNARDO DO CAMPO",
  "message": "Simulacao Banco Volks\nEntrada: R$ 25.000\nPrazo: 48 meses",
  "vehicle": {
    "id": "2341",
    "brand": "NISSAN",
    "model": "KICKS",
    "version": "1.6 16V FLEXSTART ADVANCE XTRONIC",
    "year": "2024",
    "price": "R$ 107.900",
    "plate": "TMG8C30",
    "store": "SAVOL TOYOTA - SAO BERNARDO DO CAMPO",
    "url": "https://www.savolseminovos.com.br/veiculos/nissan-kicks-2024"
  },
  "utm": {
    "utm_source": "banco-volks",
    "utm_medium": "simulador",
    "utm_campaign": "financiamento-seminovos"
  },
  "meta": {
    "page_url": "https://www.savolseminovos.com.br/veiculos/nissan-kicks-2024",
    "simulation_id": "VWFS-123456",
    "installments": "48",
    "down_payment": "25000"
  }
}
```

## Formulario integrado

Nesta versao foram integrados:

- Modal apos fechar a simulacao Volks (`financiamento-card` e `financiamento-single`)
- Formulario de proposta de financiamento no card (`proposta-financiamento-card`)

Os demais formularios gerais continuam usando `/api/leadmob`.
