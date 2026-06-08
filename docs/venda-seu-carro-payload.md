# Payload - Venda Seu Carro

Endpoint interno:

```http
POST /api/venda-seu-carro
Content-Type: multipart/form-data
```

O envio usa `multipart/form-data` porque inclui JSON estruturado e 12 fotos obrigatórias.

## Segurança

O token não é gerado no navegador. A rota do Next recebe o formulário, valida os dados e gera um token HMAC SHA-256 no servidor.

Variável recomendada:

```env
SELL_YOUR_CAR_TOKEN_SECRET=troque-por-um-segredo-forte
```

Resposta de segurança:

```json
{
  "security": {
    "tokenType": "hmac-sha256",
    "token": "hexadecimal-assinado",
    "signedFields": ["payload", "server.protocol", "server.receivedAt", "server.photoCount"]
  }
}
```

Para validar em outro sistema, serialize o mesmo payload assinado e gere:

```js
crypto.createHmac("sha256", SELL_YOUR_CAR_TOKEN_SECRET)
  .update(JSON.stringify(signedPayload))
  .digest("hex")
```

## Campos Multipart

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `payload` | JSON string | Sim | Dados completos do veículo, vendedor, consentimentos e metadados das fotos. |
| `photo_front` | File | Sim | Frente do veículo. |
| `photo_leftSide` | File | Sim | Lateral esquerda. |
| `photo_rightSide` | File | Sim | Lateral direita. |
| `photo_rear` | File | Sim | Traseira. |
| `photo_dashboard` | File | Sim | Painel. |
| `photo_odometer` | File | Sim | Odômetro. |
| `photo_spare` | File | Sim | Estepe. |
| `photo_trunk` | File | Sim | Porta-malas. |
| `photo_roof` | File | Sim | Teto. |
| `photo_tire` | File | Sim | Pneu. |
| `photo_engine` | File | Sim | Motor. |
| `photo_chassis` | File | Sim | Chassi. |

Cada foto deve ser `image/*` e ter no máximo 8 MB.

## Payload JSON

```json
{
  "schemaVersion": "1.0",
  "source": {
    "form": "venda-seu-carro",
    "channel": "site",
    "pageUrl": "http://localhost:3000/venda-seu-carro",
    "userAgent": "Mozilla/5.0 ...",
    "submittedAt": "2026-06-08T12:00:00.000Z"
  },
  "vehicle": {
    "brand": "Toyota",
    "model": "Corolla",
    "version": "2.0 XEI",
    "year": "2023/2024",
    "fuel": "Flex",
    "transmission": "Automática",
    "km": 45000,
    "color": "Prata",
    "plateEnding": "1A23",
    "bodyType": "Sedan",
    "ownerCount": "Único dono",
    "hasManual": "Sim",
    "hasSpareKey": "Sim",
    "desiredPrice": 125000,
    "notes": "Revisões em concessionária."
  },
  "seller": {
    "fullName": "Nome do cliente",
    "email": "cliente@email.com",
    "phone": "11999999999",
    "whatsapp": "11999999999",
    "city": "Santo André",
    "state": "SP",
    "contactPeriod": "Tarde",
    "contactChannel": "WhatsApp"
  },
  "consents": {
    "acceptedTerms": true,
    "acceptedLgpd": true,
    "acceptedAt": "2026-06-08T12:00:00.000Z"
  },
  "photos": [
    {
      "slotId": "front",
      "label": "Frente",
      "required": true,
      "fieldName": "photo_front",
      "fileName": "frente.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 123456,
      "lastModified": "2026-06-08T11:50:00.000Z"
    }
  ]
}
```

## Resposta de Sucesso

```json
{
  "ok": true,
  "protocol": "SAVOL-VSC-20260608-123456",
  "receivedAt": "2026-06-08T12:00:01.000Z",
  "security": {
    "tokenType": "hmac-sha256",
    "token": "abc123...",
    "signedFields": ["payload", "server.protocol", "server.receivedAt", "server.photoCount"]
  }
}
```

## Resposta de Erro

```json
{
  "ok": false,
  "error": "Foto obrigatória ausente: photo_front."
}
```

## Observação de Arquitetura

Não coloque segredo/token fixo no frontend. O browser envia apenas os dados do formulário. A rota server-side adiciona o protocolo e a assinatura HMAC antes de responder ou repassar o lead para um CRM/webhook.
