# Google Cloud Platform (GCP) Budget Cap Setup

This guide walks you through configuring a hard budget cap on your Google Cloud Project. This ensures that the Gemini API usage will never exceed $150/month, preventing unexpected billing overages.

## Prerequisites

- You must be a **Billing Administrator** or **Project Owner** in the Google Cloud Console.
- Your project (`letter-translator-prod`) must be associated with an active billing account.

## Step 1: Navigate to Billing

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top-left navigation menu (hamburger icon ☰), select **Billing**.
3. If prompted, select your organization's billing account.

## Step 2: Create the Budget

1. In the Billing sidebar menu, click on **Budgets & alerts**.
2. Click the **+ CREATE BUDGET** button at the top.
3. **Name**: Enter `Letter Translator - Gemini API Monthly Cap`.
4. **Projects**: Ensure your specific project is selected.
5. **Services**: Leave as "All services" or explicitly select "Generative Language API" if you prefer.
6. Click **Next**.

## Step 3: Set Amount (The Cap)

1. Under "Budget type", select **Specified amount**.
2. **Target amount**: Enter `$150.00`.
   *(Note: The projected spend for 2,000 letters is roughly $0.76/month. Setting the cap at $150 provides ample headroom for spikes while still offering a strict safety net).*
3. Click **Next**.

## Step 4: Set Alert Thresholds

Google will send emails at these usage marks.
1. Add the following rules (percentages of your $150 budget):
   - **50%** ($75.00)
   - **90%** ($135.00)
   - **100%** ($150.00)

## Step 5: Configure Hard Cap Action (Crucial Step)

By default, budgets in GCP only send *alerts*. To create a true "hard cap", we must command Google to disable the API when the 100% mark is hit.

1. Under "Manage notifications", check the box for **Connect a Pub/Sub topic to this budget**.
2. *If this is your first time, you may need to click "Create a topic". Name it `budget-cap-enforcer`.*
3. **Important Checkbox**: Ensure **Disable billing when budget reaches 100%** (or if using a Cloud Function, ensure the trigger is set to disable the API/Billing at the 100% threshold). 
   *(Note: In simpler setups natively supported by newer GCP interfaces, look for the literal "Cap API usage" or "Disable Billing" checkbox. If using Cloud Functions to sever billing, refer to the [GCP API Quota documentation](https://cloud.google.com/billing/docs/how-to/notify#cap_disable_billing).*

## Step 6: Set Notification Channels

1. Under "Email notifications", select or add your monitoring emails.
2. Enter:
   - `nestico@childrenbelieve.ca`
   - `ehernandez@childrenbelieve.ca`
3. Click **FINISH** or **SAVE**.

---

## 📋 Manager Verification Sign-Off Checklist

*IT/Infrastructure managers should verify these steps are completed and initial.*

- [ ] Budget created with name "Letter Translator - Gemini API Monthly Cap"
- [ ] Hard cap amount set exactly at **$150/month**
- [ ] Alert thresholds confirmed at **50%, 90%, 100%**
- [ ] Action configured to **Disable billing** or cap APIs at 100%
- [ ] Notification emails configured for `nestico` and `ehernandez`
- [ ] Test alert received (if applicable)

**Verified By**: _______________  **Date**: ____________

---

## 📈 Monthly Review Recommendation

At the end of each billing cycle, check the actual spend vs. the projected ($0.76/month for ~2,000 letters). 

> **Warning**: If the monthly spend exceeds **$5.00**, immediately investigate for anomalous usage patterns (e.g., automated scraping, compromised API keys, or significantly larger-than-expected image payloads).
