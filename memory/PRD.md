# PRD — UrbanPulse CityHub (SaaS de Lojas da Cidade)

## Problema original
Aplicativo mobile SaaS para cadastrar lojas de uma cidade. O usuário final descobre lojas por categoria; o produto tem fluxo completo de login, fluxo de consumidor, fluxo de lojista e fluxo de administrador. Requisitos do usuário: planos SaaS (Grátis/Pro/Premium), destaques/banners, página da loja com WhatsApp/telefone/endereço-mapa/catálogo/avaliações.

## Arquitetura
- Frontend: Expo Router (SDK 57), React Native, TypeScript, TanStack React Query, tema em `src/theme.ts`.
- Backend: FastAPI em `0.0.0.0:8001`, rotas com prefixo `/api`.
- Banco: MongoDB (`MONGO_URL`).
- Auth: JWT customizado + RBAC (`user`, `store_owner`, `super_admin`) via passlib/bcrypt.
- Ícones: `lucide-react-native` + `react-native-svg`.

## Personas
- Consumidor (`user`): explora categorias, busca/vê lojas, favorita, avalia, contata via WhatsApp/telefone/mapa.
- Lojista (`store_owner`): painel, métricas, catálogo de produtos, planos SaaS.
- Super Admin (`super_admin`): governança da cidade, métricas/MRR, moderação de lojas.

## Requisitos centrais (estáticos)
- Descoberta por categorias + busca/filtros.
- Página da loja: WhatsApp direto, telefone, endereço com abertura no Maps, catálogo, avaliações.
- Favoritos autenticados.
- Avaliações autenticadas (rating + comentário).
- Painéis por papel + planos SaaS.

## Implementado (com datas)
- 2026-06 (features): (1) Upload real de fotos (logo, banner, foto de produto) via Emergent Object Storage — `POST /api/upload` + `GET /api/files/{path}` (público), componente `ImagePickerField` (galeria+câmera com permissões), caminhos salvos relativos e resolvidos por `resolveMediaUrl` (host-agnostic p/ deploy). (2) Animações de entrada em cascata (`AnimatedItem`) em listas. (3) Lojas Premium fixadas no topo da Home + selo VIP com pulso animado. (4) Acesso por papel: consumidor não vê portais de lojista/admin no Perfil; alternador demo discreto. (5) Cabeçalhos escuros (padrão Home) em Categorias, Favoritos, Perfil, Painel do Lojista, Catálogo, Planos e Admin. Validado backend 11/11 + frontend 23/23 (iteration_4).
- 2026-06 (redesign): Identidade visual "fusão Nubank + Duolingo" (mantendo paleta âmbar): tokens refinados em `theme.ts` + helpers `TACTILE_CARD`/`TACTILE_BLOCK`/`INK`; novo componente `PressableScale` (reanimated + haptics). Home do consumidor totalmente repaginada (hero escuro com saudação, busca flutuante, tiles de categoria táteis, carrossel VIP, skeletons); StoreCard, Login, Categorias, Favoritos, Loja, Planos, Painel Lojista e Admin com cartões/botões táteis (raio 20, borda 2px, profundidade). Regressão 8/8 (iteration_3).
- 2026-06: Plataforma full-stack inicial (auth JWT/RBAC, seed demo, categorias, lojas, favoritos, avaliações, produtos, métricas de lojista e admin).
- 2026-06: Telas — login, explorar, categorias, favoritos, perfil, detalhe de loja, painel/catálogo/planos de lojista, dashboard admin.
- 2026-06 (esta sessão): Correção do fluxo de avaliação do consumidor:
  - `switchDemoRole` lança erro em falha; chamadores só navegam em sucesso e mostram erro.
  - Removido `alert()` proibido no submit de avaliação; substituído por `review-error-box` inline; `openReviewModal` reseta estado.
  - Import `StyleSheet` faltante adicionado em `store/[id].tsx` e `RoleSwitcherModal.tsx`; import `Alert` não usado removido do profile.
  - Validado end-to-end (testing agent iteration_2): fluxo consumidor → loja → avaliação persiste (contagem 4→5); regressões OK.

## Credenciais demo
- Consumidor: user@cidadehub.com / user123
- Lojista: lojista@cidadehub.com / lojista123
- Super admin: admin@cidadehub.com / admin123

## Backlog priorizado
- P1: Cadastro/edição de loja pelo lojista com upload de logo/banner via Emergent Object Storage (hoje usa URLs/seed).
- P1: Mapa embutido real na página da loja (hoje abre Google Maps externo).
- P1: Pagamentos reais para planos/destaques/banners (Stripe/Razorpay) — somente sob solicitação e integração aprovada.
- P2: Moderação de avaliações e denúncias no admin.
- P2: Onboarding do consumidor por cidade/geolocalização.

## Próximas tarefas
- Aguardar direção do usuário para próxima feature (cadastro de loja com fotos, mapa embutido, ou monetização real).
- Silenciar (opcional) warnings web de `shadow*` migrando para `boxShadow`.
