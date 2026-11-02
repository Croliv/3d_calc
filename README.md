# 3D Calculator — versão 1.0

Aplicação React + Vite para estimativa de custos e precificação de impressão 3D. Os dados ficam no navegador, usando IndexedDB, com exportação e restauração de backup JSON.

## Requisitos

- Node.js LTS (recomendado: versão 20 ou superior)
- VS Code
- Navegador atualizado (Chrome, Edge ou Firefox)

## Instalação

1. Extraia `3d-calculator-v1.zip` para uma pasta, por exemplo `C:\Projetos\3d-calculator`.
2. Abra o VS Code.
3. Clique em **Arquivo > Abrir Pasta** e selecione a pasta `3d-calculator`.
4. Abra **Terminal > Novo Terminal**.
5. Execute:

```bash
npm install
npm run dev
```

6. Abra o endereço local informado pelo Vite, normalmente `http://localhost:5173`.

## Gerar versão de produção

```bash
npm run build
npm run preview
```

A pasta `dist` conterá os arquivos prontos para hospedagem estática, por exemplo na Vercel.

## Funcionalidades incluídas

- Dashboard com indicadores e gráfico de custos x preço sugerido.
- Calculadora com material, energia, depreciação, manutenção, mão de obra, perdas e despesas extras.
- Cadastro de filamentos.
- Cadastro de impressoras.
- Histórico de orçamentos.
- Precificação por margem desejada, taxas percentuais e taxa fixa.
- Tema claro/escuro.
- Backup e restauração JSON.
- Persistência local via IndexedDB.

## Observações sobre o modelo de cálculo

- A energia usa potência média informada (W), duração (h) e tarifa (R$/kWh).
- A depreciação usa (valor de aquisição - valor residual) / vida útil em horas.
- A perda é aplicada ao consumo de material por meio de `gramas / (1 - taxa de falhas)`.
- A margem desejada é margem sobre o preço final. O preço sugerido é `(custo unitário + taxa fixa) / (1 - taxas percentuais - margem)`.
- Taxas e margem combinadas precisam ser inferiores a 100%.

Os valores são estimativas. Para uso comercial, valide o consumo real da impressora, a tarifa de energia, a vida útil e as regras tributárias aplicáveis.

## Armazenamento e migração futura

O acesso ao armazenamento está isolado em `src/services/database.js`. Isso permite substituir ou complementar IndexedDB por uma API/Supabase no futuro, mantendo a interface e o motor de cálculo separados. Faça backups JSON regularmente: os dados locais pertencem ao perfil do navegador e dispositivo em que foram cadastrados.

## Limitações da versão 1.0

- Não há sincronização entre dispositivos nem login.
- O dashboard apresenta indicadores dos orçamentos salvos, não vendas realizadas.
- O custo de mão de obra e outros custos é informado por peça/unidade.
- Estoque de filamento, clientes, pedidos, exportação PDF e comparação de múltiplos cenários ficam para próximas versões.
