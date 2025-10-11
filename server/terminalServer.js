import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

const app = express()
const port = process.env.TERMINAL_SERVER_PORT ? Number(process.env.TERMINAL_SERVER_PORT) : 8787

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set. Please configure it in your environment variables.')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

app.use(cors())
app.use(express.json())

const requireLocationId = () => {
  const locationId = process.env.STRIPE_TERMINAL_LOCATION_ID
  if (!locationId) {
    throw new Error('STRIPE_TERMINAL_LOCATION_ID is not set. Please create a Terminal location in Stripe and set the ID.')
  }
  return locationId
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/terminal/connection_token', async (_req, res) => {
  try {
    const connectionToken = await stripe.terminal.connectionTokens.create({
      location: requireLocationId(),
    })
    res.json({ secret: connectionToken.secret })
  } catch (error) {
    console.error('Failed to create connection token:', error)
    res.status(500).json({ error: 'Failed to create connection token' })
  }
})

app.post('/terminal/payment_intents', async (req, res) => {
  try {
    const { amount, currency = 'eur', description, metadata, capture_method } = req.body ?? {}

    if (!amount || Number.isNaN(Number(amount))) {
      return res.status(400).json({ error: 'amount is required and must be numeric' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)),
      currency,
      payment_method_types: ['card_present'],
      capture_method: capture_method === 'manual' ? 'manual' : 'automatic',
      description,
      metadata,
    })

    res.json({
      client_secret: paymentIntent.client_secret,
      id: paymentIntent.id,
      status: paymentIntent.status,
    })
  } catch (error) {
    console.error('Failed to create payment intent:', error)
    res.status(500).json({ error: 'Failed to create payment intent' })
  }
})

app.post('/terminal/payment_intents/:intentId/cancel', async (req, res) => {
  try {
    const { intentId } = req.params
    const cancelledIntent = await stripe.paymentIntents.cancel(intentId)
    res.json(cancelledIntent)
  } catch (error) {
    console.error('Failed to cancel payment intent:', error)
    res.status(500).json({ error: 'Failed to cancel payment intent' })
  }
})

app.post('/terminal/payment_intents/:intentId/capture', async (req, res) => {
  try {
    const { intentId } = req.params
    const capturedIntent = await stripe.paymentIntents.capture(intentId)
    res.json(capturedIntent)
  } catch (error) {
    console.error('Failed to capture payment intent:', error)
    res.status(500).json({ error: 'Failed to capture payment intent' })
  }
})

app.listen(port, () => {
  console.log(`Stripe Terminal server listening on http://localhost:${port}`)
})
