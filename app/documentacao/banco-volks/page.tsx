import type { Metadata } from "next";
import { HomeSessionDataProvider } from "@/components/HomeSessionDataProvider";
import { SavolMegaFooter } from "@/components/SavolMegaFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "API Banco Volks | SAVOL Seminovos",
  description: "Documentacao publica para envio de leads de financiamento do Banco Volks para a SAVOL Seminovos."
};

const apiUrl = "https://www.savolseminovos.com.br/api/integracoes/banco-volks/leads";

export default function BancoVolksDocsPage() {
  return (
    <main>
      <SiteHeader active="institucional" />
      <section className="public-api-doc container">
        <header className="public-api-doc-hero">
          <p>Documentacao publica</p>
          <h1>API de leads de financiamento Banco Volks</h1>
          <span>Versao 1.0 - SAVOL Seminovos</span>
        </header>

        <article className="public-api-doc-panel">
          <h2>Endpoint</h2>
          <pre><code>{`POST ${apiUrl}`}</code></pre>
          <p>
            Use este endpoint para enviar para a SAVOL os leads gerados no fluxo "Simule seu financiamento".
            O token de acesso deve ser enviado pela SAVOL em canal privado.
          </p>
        </article>

        <article className="public-api-doc-panel">
          <h2>Autenticacao</h2>
          <pre><code>{`Authorization: Bearer <TOKEN_FORNECIDO_PELA_SAVOL>
X-Savol-Timestamp: 1782200000
X-Savol-Signature: sha256=<HMAC_SHA256>
X-Savol-Request-Id: VWFS-123456
Content-Type: application/json
Accept: application/json`}</code></pre>
          <p>
            A SAVOL fornece dois segredos em canal privado: o token Bearer e o segredo de assinatura HMAC.
            A assinatura deve ser calculada sobre o corpo JSON bruto enviado na requisicao.
          </p>
        </article>

        <article className="public-api-doc-panel">
          <h2>Seguranca</h2>
          <div className="public-api-doc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Controle</th>
                  <th>Regra</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Token Bearer</td>
                  <td>Obrigatorio no header <code>Authorization</code>.</td>
                </tr>
                <tr>
                  <td>Assinatura HMAC</td>
                  <td>Obrigatoria no header <code>X-Savol-Signature</code>, usando SHA-256.</td>
                </tr>
                <tr>
                  <td>Timestamp</td>
                  <td>Obrigatorio no header <code>X-Savol-Timestamp</code>. A janela aceita e de 5 minutos.</td>
                </tr>
                <tr>
                  <td>Tamanho</td>
                  <td>O corpo da requisicao deve ter no maximo 128KB.</td>
                </tr>
                <tr>
                  <td>Transporte</td>
                  <td>Enviar apenas por HTTPS.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="public-api-doc-panel">
          <h2>Geracao da assinatura</h2>
          <p>A assinatura e o HMAC-SHA256 de <code>{`timestamp + "." + body`}</code>.</p>
          <pre><code>{`const crypto = require("crypto");

const body = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = crypto
  .createHmac("sha256", SAVOL_SIGNING_SECRET)
  .update(\`\${timestamp}.\${body}\`)
  .digest("hex");

await fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${SAVOL_TOKEN}\`,
    "X-Savol-Timestamp": timestamp,
    "X-Savol-Signature": \`sha256=\${signature}\`,
    "X-Savol-Request-Id": "VWFS-123456",
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  body
});`}</code></pre>
        </article>

        <article className="public-api-doc-panel">
          <h2>Campos obrigatorios</h2>
          <div className="public-api-doc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Descricao</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>name</code></td>
                  <td>string</td>
                  <td>Nome do cliente.</td>
                </tr>
                <tr>
                  <td><code>phone</code></td>
                  <td>string</td>
                  <td>Telefone com DDD. Minimo de 10 digitos.</td>
                </tr>
                <tr>
                  <td><code>email</code></td>
                  <td>string</td>
                  <td>E-mail valido do cliente.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="public-api-doc-panel">
          <h2>Campos recomendados</h2>
          <div className="public-api-doc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Descricao</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>cpf</code></td>
                  <td>string</td>
                  <td>CPF do cliente, apenas numeros ou formatado.</td>
                </tr>
                <tr>
                  <td><code>unitName</code></td>
                  <td>string</td>
                  <td>Unidade escolhida pelo cliente, quando existir.</td>
                </tr>
                <tr>
                  <td><code>message</code></td>
                  <td>string</td>
                  <td>Resumo da simulacao, observacoes e condicoes escolhidas.</td>
                </tr>
                <tr>
                  <td><code>vehicle</code></td>
                  <td>object</td>
                  <td>Dados do veiculo de interesse.</td>
                </tr>
                <tr>
                  <td><code>utm</code></td>
                  <td>object</td>
                  <td>Parametros de midia, como utm_source, utm_medium e utm_campaign.</td>
                </tr>
                <tr>
                  <td><code>meta</code></td>
                  <td>object</td>
                  <td>Metadados da origem, pagina, campanha ou identificadores internos.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="public-api-doc-panel">
          <h2>Exemplo de request</h2>
          <pre><code>{`{
  "name": "Cliente Teste",
  "phone": "11999999999",
  "email": "cliente@email.com",
  "cpf": "12345678910",
  "unitName": "SAVOL TOYOTA - SAO BERNARDO DO CAMPO",
  "message": "Simulacao Banco Volks\\nEntrada: R$ 25.000,00\\nPrazo: 48 meses",
  "vehicle": {
    "id": "2341",
    "brand": "NISSAN",
    "model": "KICKS",
    "version": "1.6 16V FLEXSTART ADVANCE XTRONIC",
    "year": "2024",
    "price": "R$ 107.900,00",
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
}`}</code></pre>
        </article>

        <article className="public-api-doc-panel">
          <h2>Exemplo de resposta</h2>
          <pre><code>{`{
  "ok": true,
  "protocol": "SAVOL-FIN-20260623-123456",
  "status": "received"
}`}</code></pre>
        </article>

        <article className="public-api-doc-panel">
          <h2>Status HTTP</h2>
          <div className="public-api-doc-table-wrap">
            <table>
              <tbody>
                <tr>
                  <td><code>200</code></td>
                  <td>Lead recebido e processado.</td>
                </tr>
                <tr>
                  <td><code>400</code></td>
                  <td>Payload invalido ou campos obrigatorios ausentes.</td>
                </tr>
                <tr>
                  <td><code>401</code></td>
                  <td>Token, timestamp ou assinatura ausente/invalido.</td>
                </tr>
                <tr>
                  <td><code>413</code></td>
                  <td>Payload acima do limite permitido.</td>
                </tr>
                <tr>
                  <td><code>415</code></td>
                  <td>Content-Type diferente de application/json.</td>
                </tr>
                <tr>
                  <td><code>502</code></td>
                  <td>Falha ao encaminhar o lead para os destinos internos.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
      <HomeSessionDataProvider>
        <SavolMegaFooter />
      </HomeSessionDataProvider>
    </main>
  );
}
