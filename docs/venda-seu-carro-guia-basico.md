# Venda Seu Carro - Guia Básico

Este documento resume como funciona o envio do formulário **Venda Seu Carro**.

## Endpoint

```http
POST /api/venda-seu-carro
```

O envio é feito como `multipart/form-data`, porque o formulário envia:

- um campo `payload` com os dados em JSON;
- 12 fotos obrigatórias do veículo.

## Fluxo

1. O usuário preenche o formulário.
2. O frontend monta um JSON chamado `payload`.
3. O frontend adiciona as fotos ao `FormData`.
4. O frontend envia tudo para `/api/venda-seu-carro`.
5. A API valida os dados e as fotos.
6. A API gera um protocolo.
7. A API assina o envio com um token HMAC no servidor.
8. A API retorna sucesso ou erro.

## Segurança

O segredo usado para assinar o envio fica apenas no servidor:

```env
SELL_YOUR_CAR_TOKEN_SECRET=seu-segredo-forte
```

Esse segredo **não deve ir para o frontend**.

A assinatura retornada serve para comprovar que aquele pacote foi processado pelo servidor.

## Exemplo de Resposta

```json
{
  "ok": true,
  "protocol": "SAVOL-VSC-20260608-123456",
  "receivedAt": "2026-06-08T12:00:01.000Z",
  "security": {
    "tokenType": "hmac-sha256",
    "token": "assinatura-gerada-no-servidor"
  }
}
```

## Campos Principais do Payload

```json
{
  "vehicle": {
    "brand": "Toyota",
    "model": "Corolla",
    "year": "2023/2024",
    "fuel": "Flex",
    "transmission": "Automática",
    "km": 45000,
    "color": "Prata",
    "desiredPrice": 125000
  },
  "seller": {
    "fullName": "Nome do cliente",
    "email": "cliente@email.com",
    "phone": "11999999999",
    "city": "Santo André",
    "state": "SP",
    "contactChannel": "WhatsApp"
  },
  "consents": {
    "acceptedTerms": true,
    "acceptedLgpd": true
  }
}
```

## Fotos Obrigatórias

O formulário exige 12 fotos:

- Frente
- Lateral esquerda
- Lateral direita
- Traseira
- Painel
- Odômetro
- Estepe
- Porta-malas
- Teto
- Pneu
- Motor
- Chassi

Cada foto deve ser uma imagem (`image/*`) com até 8 MB.

## Arquivos Enviados

Os nomes dos campos das fotos são:

```text
photo_front
photo_leftSide
photo_rightSide
photo_rear
photo_dashboard
photo_odometer
photo_spare
photo_trunk
photo_roof
photo_tire
photo_engine
photo_chassis
```

## Observação

O endpoint atual é público para receber envios do site. Para aumentar a proteção em produção, recomenda-se adicionar:

- rate limit;
- Cloudflare Turnstile ou reCAPTCHA;
- validação de origem;
- integração server-side com CRM ou webhook.
