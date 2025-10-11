# Android Tap-to-Pay Wrapper Plan

This document sketches how to wrap the existing web POS inside a minimal Android shell so that payments can be captured through Stripe Terminal’s **Tap to Pay on Android** (or the hardware readers if you swap the discovery mode). The goal is to keep the React/Vite codebase unchanged while adding a native bridge that handles NFC access and relays payment results back to the browser UI.

> ⚠️ Tap to Pay on Android is currently in beta. Ensure your Stripe account is approved before attempting the native integration.

## 1. High-Level Architecture

```
┌──────────────────────────────────────────┐
│ Android App (Kotlin)                     │
│  ├─ WebView (loads https://your-pos.app) │
│  ├─ JavascriptInterface (“POSBridge”)    │
│  └─ Stripe Terminal SDK (native)         │
└──────────────────────────────────────────┘

Backend (already implemented in this repo)
  ├─ POST /terminal/connection_token
  └─ POST /terminal/payment_intents

Stripe APIs handle PaymentIntents + card-present processing.
```

1. The WebView renders the existing POS (production/staging build).
2. When the cashier selects **Tap to Pay**, the web layer posts a message (e.g., `window.POSBridge.startTapPayment({...})`).
3. The native layer receives the request, creates/connects a reader using Stripe Terminal, collects and processes the card-present PaymentIntent, and relays the result back to the WebView (`window.onTapPaymentResult(...)`).
4. The web code continues its `completeSale` flow exactly as it does today, using the PaymentIntent ID and status provided by native.

## 2. Native Project Skeleton

Create a new Android project (e.g., `android-pos-wrapper`). Below is a minimal `MainActivity` in Kotlin showing the moving parts.

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val terminalHelper by lazy { TerminalHelper(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        TerminalApplication.configureTerminal(this)

        webView = findViewById(R.id.posWebView)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        webView.addJavascriptInterface(PosBridge(terminalHelper, webView), "POSBridge")
        webView.loadUrl(BuildConfig.PPOS_BASE_URL)
    }

    override fun onDestroy() {
        super.onDestroy()
        terminalHelper.disconnectIfNeeded()
    }
}
```

### POSBridge (JavaScript Interface)

```kotlin
class PosBridge(
    private val terminalHelper: TerminalHelper,
    private val webView: WebView
) {
    @JavascriptInterface
    fun startTapPayment(jsonPayload: String) {
        val payload = JSONObject(jsonPayload)
        val amount = payload.getDouble("amount")
        val currency = payload.optString("currency", "eur")
        val metadata = payload.optJSONObject("metadata")

        terminalHelper.startTapPayment(
            amountMajorUnits = amount,
            currency = currency,
            metadata = metadata
        ) { result ->
            val callback = "window.onTapPaymentResult(${result.toJsonString()});"
            webView.post { webView.evaluateJavascript(callback, null) }
        }
    }
}
```

### TerminalHelper (native Stripe logic)

```kotlin
class TerminalHelper(private val context: Context) {
    private val terminal by lazy { TerminalApplication.terminal }
    private val backend = TerminalBackendClient()

    private var connectedReader: Reader? = null

    suspend fun startTapPayment(
        amountMajorUnits: Double,
        currency: String,
        metadata: JSONObject?,
        onResult: (TapResult) -> Unit
    ) {
        try {
            val reader = connectedReader ?: discoverAndConnect() ?: throw IllegalStateException("No reader")
            val intent = backend.createPaymentIntent(amountMajorUnits, currency, metadata)
            val collectResult = terminal.collectPaymentMethod(intent.clientSecret)
            val processedIntent = terminal.processPayment(collectResult.paymentIntent)
            backend.finalizePayment(processedIntent.id)
            onResult(TapResult.success(processedIntent.id))
        } catch (e: Exception) {
            onResult(TapResult.failure(e.message ?: "Tap payment failed"))
        }
    }

    private suspend fun discoverAndConnect(): Reader? {
        val config = DiscoveryConfiguration(DiscoveryMethod.TAP_TO_PAY, 0, true)
        val readers = terminal.discoverReaders(config)
        val reader = readers.firstOrNull() ?: return null
        terminal.connectReader(reader, ConnectionConfiguration.TapToPay())
        connectedReader = reader
        return reader
    }

    fun disconnectIfNeeded() {
        connectedReader?.let { terminal.disconnectReader(it) }
    }
}
```

> The code above uses coroutines (`suspend`), but you can also stick to callbacks. Replace `DiscoveryMethod.TAP_TO_PAY` with `DiscoveryMethod.INTERNET` if you later support hardware readers.

## 3. Web ↔ Native Messaging Contract

Define a simple protocol between the web app and the native layer:

### From Web to Native

```ts
window.POSBridge?.startTapPayment(JSON.stringify({
  amount: totalAmount,  // in major currency units
  currency: 'eur',
  metadata: { saleId, branchId }
}));
```

### From Native to Web

```ts
window.onTapPaymentResult?.({
  status: 'succeeded' | 'failed',
  paymentIntentId?: string,
  errorMessage?: string,
});
```

In `SalesMobile.tsx`, detect the native environment (e.g., `if (window.POSBridge) { ... }`) and call the native bridge instead of the JS terminal flow. Handle the callback by routing it through the existing `completeSale` logic.

## 4. Backend Configuration

The Android wrapper reuses the Node server you already created:

- `STRIPE_SECRET_KEY`
- `STRIPE_TERMINAL_LOCATION_ID` (must correspond to the physical device OR a tap-to-pay location)
- `TERMINAL_SERVER_PORT`
- `VITE_TERMINAL_SERVER_URL` (for the web layer if you embed a local build)

Expose those endpoints publicly so the Android app can reach them (or host them alongside your API).

## 5. Permissions & Enrollment Checklist

1. Request Tap to Pay on Android access in the Stripe Dashboard.
2. Update `AndroidManifest.xml`:
   - `USES_PERMISSION android.permission.NFC`
   - `USES_FEATURE android.hardware.nfc.hce`
3. Follow Stripe’s Tap to Pay beta docs to register the application package name.
4. Use a physical Android device for testing (simulators can’t emulate NFC).

## 6. Next Steps

- Scaffold the Android project (`android-pos-wrapper`).
- Add Gradle dependencies:
  ```gradle
  implementation 'com.stripe:stripeterminal:3.0.0'
  implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1"
  ```
- Implement the `TerminalBackendClient` to hit `/terminal/connection_token` and `/terminal/payment_intents`.
- Modify the web POS to gate between the native bridge and the current simulator (e.g., `if (window.POSBridge) { ... } else { fallback }`).
- QA with a physical device once Stripe approves Tap to Pay access.

Once the Android host is operational, apply the same pattern for iOS using the Stripe Terminal iOS SDK to unlock Tap to Pay on iPhone.
