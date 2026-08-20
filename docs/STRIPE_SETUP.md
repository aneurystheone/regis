# Configuración de Stripe - Guía Rápida

## Paso 1: Crear Producto en Stripe Dashboard ✅ (Ya tienes las keys)

1. Ve a [Stripe Dashboard - Test Mode](https://dashboard.stripe.com/test/products)
2. Click en **"+ Add product"**
3. Configura el producto:
   - **Name**: `REGIS Premium`
   - **Description**: `Acceso completo a IA Vicente y funciones avanzadas`
   - **Pricing**:
     - **Recurring**: Monthly
     - **Price**: $7.00 USD
     - **Currency**: USD
   - Click **"Save product"**
4. **Copia el Price ID** (empieza con `price_...`)
5. Pégalo en `.env.local` en la variable `VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY`

---

## Paso 2: Configurar Webhook (Para backend)

### Opción A: Stripe CLI (Desarrollo local)
```bash
# Instalar Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forwarding webhooks a localhost
stripe listen --forward-to localhost:5001/regis-dev/us-central1/stripeWebhook
```

### Opción B: Webhook en Dashboard (Para producción)
1. Ve a [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. URL: `https://us-central1-regis-dev.cloudfunctions.net/stripeWebhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia el **Signing secret** (empieza con `whsec_...`)

---

## Paso 3: Variables de Entorno Completas

### `.env.local` (Frontend)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SvYPxBu7MmpiumLeH3HQ...
VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_xxxxxxxxxxxxx
```

### Firebase Functions Environment Variables (Backend)
```bash
cd functions
firebase functions:config:set stripe.secret_key="sk_test_51SvYPxBu7MmpiumLWLhTU..."
firebase functions:config:set stripe.webhook_secret="whsec_xxxxxxxxxxxxx"
firebase functions:config:set app.url="http://localhost:5173"
```

---

## Paso 4: Implementar Cloud Functions

Necesitas crear el backend en Firebase Functions para:
1. **createCheckoutSession** - Crear sesión de pago
2. **createPortalSession** - Portal de gestión de suscripción
3. **stripeWebhook** - Manejar eventos de Stripe

¿Quieres que implemente las Cloud Functions ahora?

---

## Testing Checklist

- [ ] Producto creado en Stripe
- [ ] Price ID copiado a `.env.local`
- [ ] Cloud Functions desplegadas
- [ ] Webhook configurado
- [ ] Tarjeta de prueba: `4242 4242 4242 4242`
- [ ] Flujo completo: Ver planes → Checkout → Webhook actualiza Firestore → Badge cambia a PRO
