# 🎯 Configurar Webhook de Stripe - Guía Paso a Paso

## ✅ Estado Actual
Las Cloud Functions están desplegadas:
- `createCheckoutSession` ✅
- `createPortalSession` ✅  
- `stripeWebhook` ✅

**Webhook URL**: `https://us-central1-gen-lang-client-0875059420.cloudfunctions.net/stripeWebhook`

---

## 📝 Pasos para Configurar

### 1. Ir a Stripe Dashboard

Abre: **[https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)**

(Asegúrate de estar en modo **Test**)

---

### 2. Crear Webhook Endpoint

1. Click en **"Add endpoint"** o **"+ Agregar endpoint"**
2. En **"Endpoint URL"**, pega:
   ```
   https://us-central1-gen-lang-client-0875059420.cloudfunctions.net/stripeWebhook
   ```

3. En **"Description"** (opcional):
   ```
   REGIS Subscription Webhook
   ```

---

### 3. Seleccionar Eventos

En **"Select events to listen to"**, selecciona estos 5 eventos:

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

> **Tip**: Usa el buscador para encontrarlos rápidamente

---

### 4. Crear el Endpoint

Click en **"Add endpoint"** al final del formulario.

---

### 5. Copiar el Signing Secret

Después de crear el endpoint, verás una página con los detalles.

1. Busca la sección **"Signing secret"**
2. Click en **"Reveal"** o **"Click to reveal"**
3. Copia el secreto (empieza con `whsec_...`)

**Ejemplo**: `whsec_1a2b3c4d5e6f7g8h9i0j...`

---

### 6. Configurar el Secret en Firebase

Abre una terminal en tu proyecto y ejecuta:

```bash
npx firebase-tools functions:config:set stripe.webhook_secret="whsec_TU_SECRET_AQUI" --project gen-lang-client-0875059420
```

Reemplaza `whsec_TU_SECRET_AQUI` con el secret que copiaste.

---

### 7. Re-desplegar Functions

```bash
npx firebase-tools deploy --only functions --project gen-lang-client-0875059420
```

Esto actualizará las functions con el webhook secret configurado.

---

### 8. Verificar Configuración

De vuelta en Stripe Dashboard:

1. Ve a tu webhook recién creado
2. Click en la pestaña **"Send test webhook"**
3. Selecciona `checkout.session.completed`
4. Click **"Send test webhook"**

Si todo está bien, verás **Status: 200** ✅

---

## 🧪 Probar el Flujo Completo

### En la App:

1. Recarga la app: `http://localhost:5173`
2. Inicia sesión
3. Ve a **Settings → Suscripción**
4. Click **"Mejorar a Premium"**
5. Usa tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura (ej: `12/34`)
   - CVC: Cualquier 3 dígitos (ej: `123`)
   - ZIP: Cualquier código
6. Completa el pago
7. Deberías regresar a Settings
8. **Verifica**:
   - Badge debería mostrar **"PRO"**
   - En SubscriptionManager debería decir **"Plan Premium"**

---

## 🔍 Verificar en Firestore

1. Ve a [Firebase Console](https://console.firebase.google.com/project/gen-lang-client-0875059420/firestore)
2. Busca la colección `subscriptions`
3. Deberías ver un documento con tu `userId`
4. Verifica que tenga:
   ```
   tier: "premium"
   status: "active"
   stripeSubscriptionId: "sub_xxx"
   stripeCustomerId: "cus_xxx"
   ```

---

## 🐛 Troubleshooting

### Error: "Webhook signature verification failed"
- Verifica que el `webhook_secret` esté configurado correctamente
- Re-despliega las functions después de configurarlo

### El badge no cambia a "PRO"
- Verifica en Firestore que el documento se haya creado
- Revisa la consola del navegador para errores
- Chequea los logs de la function: 
  ```bash
  npx firebase-tools functions:log --project gen-lang-client-0875059420
  ```

### "CORS error" al hacer checkout
- Las functions ya están desplegadas, no debería pasar
- Si persiste, limpia caché del navegador

---

## ✅ Checklist Final

- [ ] Webhook creado en Stripe Dashboard
- [ ] Eventos seleccionados (6 eventos)
- [ ] Signing secret copiado
- [ ] Secret configurado en Firebase (`stripe.webhook_secret`)
- [ ] Functions re-desplegadas
- [ ] Test webhook envió 200 OK
- [ ] Pago de prueba completado
- [ ] Badge actualizado a "PRO"
- [ ] Documento en Firestore creado

---

## 🎉 ¡Listo!

Una vez completados todos estos pasos, tu sistema de suscripciones estará **100% funcional**.

Los usuarios podrán:
- ✅ Ver planes disponibles
- ✅ Actualizar a Premium con Stripe
- ✅ Ver su suscripción activa
- ✅ Gestionar su facturación
- ✅ Cancelar suscripción (downgrade automático al fin del período)
