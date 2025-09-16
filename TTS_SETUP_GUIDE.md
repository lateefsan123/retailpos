# Text-to-Speech Setup Guide

## Overview
Your POS system now supports high-quality text-to-speech using OpenAI's TTS API, with browser TTS as a fallback option.

## Features
- ✅ **ChatGPT Voice Support** - Use OpenAI's premium voices including ChatGPT's voice
- ✅ **Multiple Voice Options** - Choose from 7 different voices (6 standard + 1 premium)
- ✅ **Cost Tracking** - Real-time usage and cost monitoring
- ✅ **Daily Limits** - Set character limits to control costs
- ✅ **Fallback Support** - Automatic fallback to browser TTS if API fails
- ✅ **Local Storage** - All settings and usage data stored locally

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to "API Keys" section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### 2. Configure TTS in POS System
1. Open your POS system
2. Click the "TTS Disabled" button in the header
3. In the TTS Settings modal:
   - ✅ Check "Enable Text-to-Speech"
   - ✅ Check "Use OpenAI TTS (High Quality)"
   - ✅ Check "Fallback to Browser TTS" (recommended)
   - Paste your API key in the "OpenAI API Key" field
   - Select your preferred voice from the dropdown
   - Set your daily character limit (default: 10,000)

### 3. Voice Options & Costs

#### Standard Voices ($0.015 per 1K characters):
- **Alloy** - Neutral, balanced voice
- **Echo** - Clear, professional voice
- **Fable** - Warm, friendly voice
- **Onyx** - Deep, authoritative voice
- **Nova** - Bright, energetic voice
- **Shimmer** - Soft, gentle voice

#### Premium Voice ($0.030 per 1K characters):
- **ChatGPT Voice** - The same voice used in ChatGPT

### 4. Usage Examples

#### Typical Order Announcement:
"Order contains 3 items. Item 1: Apple, quantity 2, €1.50 each, total €3.00. Item 2: Bread, 1 kilogram at €2.50 per kilogram, total €2.50. Item 3: Milk, quantity 1, €2.00 each, total €2.00. Order total is €7.50."

**Character count:** ~280 characters
**Cost:** ~$0.004 (standard) or ~$0.008 (premium)

### 5. Cost Management

#### Daily Usage Scenarios:
- **50 orders/day:** ~$0.20 (standard) / ~$0.40 (premium)
- **100 orders/day:** ~$0.40 (standard) / ~$0.80 (premium)
- **200 orders/day:** ~$0.80 (standard) / ~$1.60 (premium)

#### Monthly Costs:
- **100 orders/day:** $12-24/month
- **200 orders/day:** $24-48/month
- **500 orders/day:** $60-120/month

### 6. How to Use

1. **Enable TTS:** Click "TTS Disabled" → Enable Text-to-Speech
2. **Add Items:** Add products to the order as usual
3. **Announce Order:** Click "Announce Order" button in the sidebar
4. **Monitor Usage:** Check usage stats in TTS settings

### 7. Troubleshooting

#### If TTS doesn't work:
1. Check if TTS is enabled in settings
2. Verify API key is correct
3. Check daily limit hasn't been exceeded
4. Ensure internet connection is working
5. Try browser TTS fallback

#### If costs are too high:
1. Reduce daily character limit
2. Use standard voices instead of premium
3. Disable OpenAI TTS and use browser TTS only
4. Use TTS only for important orders

### 8. Security Notes

- ✅ API key is stored locally in your browser
- ✅ No data is sent to external servers except OpenAI
- ✅ Usage statistics are stored locally
- ✅ You can clear all data anytime

### 9. Support

If you need help:
1. Check the usage statistics in TTS settings
2. Try the "Test Voice" button to verify setup
3. Ensure your OpenAI account has sufficient credits
4. Check OpenAI's service status if API calls fail

## Ready to Use!

Your POS system now has professional-grade text-to-speech capabilities. The system will automatically handle costs, usage limits, and fallbacks to ensure a smooth experience.
