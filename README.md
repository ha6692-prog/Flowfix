# 🛡️ FlowFix — AI-Powered Income Intelligence & Parametric Insurance for Gig Workers

>FlowFix is a hyperlocal, AI-powered income protection system that detects earning dead zones in real-time and compensates gig workers instantly — before income loss becomes financial stress.

> *"We don't just insure income — we understand it, predict it, and protect it intelligently."*

**Guidewire DEVTrails 2026 | Team CodeStorm | Phase 1 Submission**
**Persona: All Delivery & Gig Economy Partners — Pan-India**

---

## Pitch Deck
https://docs.google.com/presentation/d/1cWZ4sDzWSbpYPS_MoMvCZ6YMManmVMZO/edit?usp=drivesdk&ouid=109000361084008891459&rtpof=true&sd=true

## 1. 🔴 Problem Statement

India's **~11 million** platform-based delivery partners (Swiggy, Zomato, Zepto) lose an estimated **18–25 working days per year** due to external disruptions — heavy monsoon rain, extreme heat, toxic AQI, flash floods, and civic curfews.

| What Happens | What the Worker Gets |
|---|---|
| Cyclone hits coastal region, orders stop | ₹0 |
| AQI crosses 350, dangerous to breathe | ₹0 |
| 44°C heatwave, roads empty | ₹0 |
| Flash flood, zone inaccessible | ₹0 |

**Core gaps in today's market:**
- No real-time income protection for environmental disruptions
- Manual claim systems are slow, unreliable, and humiliating
- GPS-only validation is trivially gameable by spoofing apps
- Fixed payouts ignore actual income loss (peak vs. off-peak hours)
- No system proactively helps workers *avoid* income loss before it happens

FlowFix closes all five gaps simultaneously.

---

## 2. ⏰ Why Now?

- Rapid growth of gig economy (11M+ workers in India)
- Increasing climate volatility (more frequent disruptions)
- Rise of GPS spoofing fraud in location-based systems
- Availability of real-time APIs + mobile sensors enabling parametric automation

FlowFix exists because technology has finally caught up with the problem.

---

## 3. 💡 Core Insight: Earning Impossibility, Not Just Bad Weather

Most solutions will build: `Weather API threshold crossed → payout`. That's single-signal, fraud-vulnerable, and city-level imprecise.

**FlowFix's insight:** What matters is whether *this specific worker, in their specific 2km delivery zone, is physically and economically unable to earn right now.*

We call this the **Earning Dead Zone (EDZ)** — a hyper-local, multi-signal state assessed every 15 minutes per zone. FlowFix doesn't measure rain. It measures earning impossibility.

> ⚠️ **Coverage Golden Rule: LOSS OF INCOME ONLY.**
> FlowFix strictly covers lost wages caused by external disruptions.
> Vehicle repairs, health bills, accidents, and life insurance are explicitly excluded.
> Every rupee paid out represents hours a worker could not earn — nothing else.

---

## 4. 👤 Target Persona: Pan-India Delivery & Gig Partners

**Primary Persona — Murugan**
- Age 28 | Food delivery partner (Swiggy/Zomato) | Tier-1 City Urban Zone
- 3 years on platform | Average weekly earnings: ₹4,200
- Peak disruption months: Extreme Monsoons, Heatwaves, Cyclones
- Current safety net: None

**Secondary Persona — Priya**
- Age 34 | Part-time Q-commerce partner (Zepto/Blinkit) | Dense Urban Zone
- Evening slots only | Average weekly earnings: ₹1,800
- Cannot afford to lose even a single day — premium affordability is critical

### Scenario: Murugan's Monday Morning
```
8:00 AM  — IMD issues Red Alert: 120mm rain expected in the city
8:07 AM  — FlowFix EDZ engine detects:
           Rain severity 0.88 + Platform orders down 72% + Zone riders offline 68%
           EDZ Score: 0.91 → AUTO-TRIGGER
8:17 AM  — Murugan receives: "₹50 bridge credited to UPI instantly"
           (emergency funds before full payout processing)
10:15 AM — Full ₹480 payout credited
           (AI-predicted loss ₹480 > fixed payout ₹200 → hybrid model picks higher)

Murugan did: Absolutely nothing. Zero claim filing. Zero paperwork.
```

---

## 5. 🔄 System Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                      ONBOARDING                              │
│  Register (Phone + Aadhaar) → Platform ID Verification       │
│  AI Risk Profiler → Zone Risk Score (0–100)                  │
│  Dynamic Premium Calculated → Weekly Policy Activated        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              REAL-TIME EDZ MONITORING (every 15 min)         │
│  5 signals collected per zone → EDZ Score computed           │
│  EDZ ≥ 0.78 → Claim pipeline triggered                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│           TRUSTSCORE AI ENGINE (Fraud Detection)             │
│  Behavioral DNA + Device signals + Network + Crowd analysis  │
│  TrustScore 0–100 computed                                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│         CONFIDENCE-BASED HYBRID PAYOUT PIPELINE              │
│  Payout = max(Fixed Amount, AI-Predicted Income Loss)        │
│  TrustScore ≥ 85 → ₹50 bridge (10 min) + Full payout (2 hr) │
│  TrustScore 60–84 → Soft check-in → 6hr payout              │
│  TrustScore < 60  → 50% instant + 12hr review + appeal      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              POST-EVENT INTELLIGENCE                         │
│  Worker: Explainable payout breakdown + 48hr forecast        │
│  AI Coach: Personalized income optimization insights         │
│  Insurer: Zone analytics, fraud flags, pool health           │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 💰 Weekly Pricing Model — 3-Layer AI Premium Engine

### Why Weekly?
Gig workers live week-to-week. A ₹100/month premium requires planning they don't have. A ₹29/week premium is a Tuesday decision.

### Formula
```
Final Premium = Base Rate × Zone Risk Multiplier × Personal Risk Modifier
```

**Layer 1 — Base Rate by Segment:**

| Delivery Type | Base Weekly Premium |
|---|---|
| Food Delivery (Swiggy / Zomato) | ₹25 |
| Q-Commerce (Zepto / Blinkit) | ₹30 |
| E-Commerce (Amazon / Flipkart) | ₹20 |

**Layer 2 — Zone Risk Multiplier (AI-scored from 5-year historical data):**

| Zone Score | Multiplier | Range | Zone Type |
|---|---|---|---|
| 0–30 Low | 0.8x | ₹16–₹20 | Inland, elevated, flood-resilient |
| 31–60 Medium | 1.0x | ₹20–₹30 | Urban core, moderate history |
| 61–80 High | 1.4x | ₹28–₹42 | Coastal, low-lying, flood-prone |
| 81–100 Extreme | 1.8x | ₹36–₹54 | Cyclone corridor |

**Layer 3 — Personal Risk Modifier:**

| Factor | Adjustment |
|---|---|
| Platform tenure > 18 months | −10% |
| Claim-free for 12+ weeks | −8% |
| High earnings consistency | −5% |
| New user (< 4 weeks) | +15% |
| Prior flagged claim | +20% |

**Worked Example — Murugan, Urban Zone:**
```
Base:            ₹25 (Food delivery)
Zone multiplier: 74/100 → 1.4x = ₹35
Personal:        3yr tenure (−10%) + 8wk claim-free (−8%) = −₹6.30
Final premium:   ₹28.70 → rounded to ₹29/week
```

**Fairness guardrail:** Premium cannot increase more than 25% week-over-week for existing users.

# How FlowFix Works (End-to-End)
1)  Worker subscribes to weekly plan (₹20–₹30)
2) System continuously calculates EDZ score using 5 real-time signals
3)  If EDZ ≥ 0.78 → disruption automatically detected
4)  TrustScore validates worker authenticity
5)  Instant ₹50 bridge + full payout (≤ 2 hrs)

---

## 7. ⚡ Parametric Trigger System

### The 3-Source Rule
**Any trigger requires independent confirmation from ≥ 3 data sources.** No single source ever triggers a payout.

| Disruption | Threshold | Sources Required | Base Payout |
|---|---|---|---|
| Heavy Rainfall | IMD Red Alert OR >50mm/6hr | IMD + OpenWeatherMap + Platform order drop ≥55% | ₹200/day |
| Extreme Heat | >42°C for 4+ hours | IMD + WHO advisory + Platform order drop ≥40% | ₹150/day |
| Toxic AQI | AQI >300 for 6+ hours | CPCB alert + IMD + Zone peer cluster offline | ₹100/day |
| Cyclone / Storm | IMD cyclone alert within 100km | IMD + NDMA + Platform ops suspended | ₹300/day |
| Flash Flood | NDMA alert + road closures | NDMA + Google Maps closures + Zero active riders in zone | ₹250/day |
| Civic Curfew | Official order confirmed | Government alert + Platform ops suspended + Civic API | ₹200/day |
| Local Strike | Verified local strike / bandh affecting zone | News API + Google Maps closures + Platform order drop ≥60% | ₹200/day |
| Market / Zone Closure | Sudden closure of pickup/drop zone | Platform zone status = closed + Google Maps + Peer cluster offline | ₹150/day |

---

## 8. 🧠 AI/ML Architecture

### Model 1: Zone Risk Scoring
- **Algorithm:** XGBoost Regressor
- **Features:** Elevation, proximity to water bodies, 5-year flood frequency, AQI trend, heat island intensity, historical claim rate
- **Output:** Zone Risk Score (0–100) → premium tier
- **Update cycle:** Monthly re-scoring

### Model 2: Dynamic Premium Calculator
- **Algorithm:** Gradient Boosted Regression + actuarial loss-ratio correction layer
- **Output:** Weekly premium in INR, enforcing the 25% week-over-week cap

### Model 3: EDZ Engine (Core Innovation)

```python
EDZ_Score = (
    0.30 × weather_signal_score      # Hyperlocal severity vs. 5yr baseline
  + 0.25 × platform_order_signal     # % drop vs. 4-week avg for this hour
  + 0.20 × peer_cluster_signal       # % of zone riders offline vs. normal
  + 0.15 × civic_disruption_signal   # Road closures, alerts, curfews
  + 0.10 × worker_activity_signal    # Worker's own app state (privacy-safe)
)

# Trigger threshold: EDZ ≥ 0.78
# Adaptive: threshold rises when pool < 30% capacity (prevents insolvency)
```

### Model 4: TrustScore AI Engine (Fraud Detection)

```python
TrustScore = (
    0.30 × movement_authenticity     # Speed, route consistency, accelerometer
  + 0.25 × device_integrity          # Root/emulator detection, GPS app detection
  + 0.20 × network_validation        # IP vs GPS mismatch, WiFi vs mobile data
  + 0.15 × behavioral_pattern        # Work history, timing, session consistency
  + 0.10 × environmental_validation  # API cross-verification
)
```

**Duplicate Claim Prevention:**
- Each worker can trigger only one claim per active disruption event (keyed by zone + event ID)
- If the same disruption persists across multiple days, each calendar day is a separate claimable unit with a 24-hour cooldown per worker
- Cross-worker deduplication: if the same device fingerprint appears under multiple accounts, both are flagged for manual review

### Model 5: Income Loss Prediction (Hybrid Payout Engine)
- **Algorithm:** Gradient Boosting Regressor
- **Features:** Historical earnings by hour-of-day, disruption severity, zone delivery density, peak vs. off-peak timing
- **Output:** AI-predicted rupee loss per hour of disruption
- **Payout formula:** `Final Payout = max(Fixed Base Payout, AI-Predicted Loss)`

### Model 6: Predictive Risk Advisor
- **Algorithm:** Prophet time-series forecasting
- **Output:** 48-hour forward disruption risk per zone → push notifications + Smart Advisory

---

## 9. 🛡️ Adversarial Defense & Anti-Spoofing Strategy

### The Threat
A coordinated syndicate of workers uses GPS spoofing apps to fake their location inside a declared red-alert zone while sitting at home, triggering mass false payouts and draining the liquidity pool.

### Why FlowFix is Structurally Resistant

#### 8.1 The Differentiation: Genuine Partner vs. Spoofer

GPS is only 0.10 of the EDZ Score. A spoofer who fakes GPS but cannot fake the other 4 signals scores ≈ 0.10 — far below the 0.78 trigger threshold.

| Signal | Genuine Worker in Disaster | Fraudster at Home |
|---|---|---|
| GPS Location | In flood zone | Faked to flood zone ✅ |
| Accelerometer | Motion, vehicle vibration | Stationary ❌ |
| Battery drain | High (navigation active) | Normal / charging ❌ |
| Network type | Intermittent mobile, tower-switching | Stable home WiFi ❌ |
| Cell tower | Moving across towers | Fixed home tower ❌ |
| Platform app state | Offline with active location pings | Artificially set offline ❌ |

**The "Couch Spoofer" signature:**
```
Stable WiFi + stationary accelerometer + phone charging + spoofed GPS
→ Fraud Probability: 94%
```

#### 8.2 The Data: Beyond GPS

**Behavioral DNA Fingerprinting:**
Built over each worker's first 4 weeks. Baseline includes: typical active hours, delivery speed, zone movement, app interaction patterns. During a claimed disruption, device behavior is compared against what a genuinely stranded worker looks like vs. someone at home with a spoofing app running.

**Synchronized Offline Attack Detection:**
- Genuine monsoon: riders go offline *gradually* over 30–90 minutes as conditions worsen
- Syndicate attack: >65% of zone riders go offline within the same 5-minute window
- Our system flags synchronized offline spikes as a "coordinated event" and escalates to the Fraud Surge Shield

**Social Graph Clustering:**
Workers who share referral trees + joined within 2 weeks of each other + claim the same event → elevated syndicate risk score, flagged for human review

#### 8.3 Fraud Surge Shield Mode

Automatically activates when zone claim velocity exceeds 3× the 4-week historical average:

```
Surge Shield Active:
  → TrustScore threshold raised: 60 → 75
  → Payouts staged: 50% instant, 50% post-verification
  → Graph clustering scan activated on all zone claimants
  → All new claims from that zone enter verification queue
  → Pool cap enforced: max event payout = Pool Balance × 0.40
```

This contains a coordinated attack without penalizing genuine workers in other zones.

#### 8.4 UX Balance: Fairness for Honest Workers

```
PAYOUT DECISION TREE

TrustScore ≥ 85 | 0 fraud flags
→ ₹50 bridge in 10 min + Full payout in 2 hours ✅ (zero friction)

TrustScore 65–84 | 1 soft flag
→ 1 WhatsApp: "Send a location photo"
→ Full payout within 6 hours ✅

TrustScore 45–64 | 2+ flags
→ 50% auto-released immediately
→ 50% held for 12-hour review + appeal ✅

TrustScore < 45
→ Claim held + human review within 6 hours
→ Full appeal available in app ✅

NETWORK GRACE WINDOW:
Complete offline in a declared disruption zone
→ Assumed genuine for 45 minutes
→ Re-evaluated on reconnection
→ Going dark is NOT suspicious; faking pings at home IS

FALSE POSITIVE LOOP:
Every honest worker wrongly flagged → appeal vindicates them
→ Their data improves the model
→ Fraud detection gets better every week
```

---

## 10. 🌟 Advanced Innovation Features (FlowFix Intelligence Layer)

### Feature 1: Smart Work Advisory Engine
Proactive 48-hour risk forecast pushed to the worker's app with actionable guidance:

```
🌧️ Heavy rain predicted in Velachery zone tomorrow 2–8 PM
✅ Your policy covers this if triggered
💡 Tip: Complete peak-hour deliveries before 1 PM to maximize earnings
   Forecast trigger probability: 78%
```

Transforms FlowFix from a passive insurance product into an **active financial planning tool** for workers who live day-to-day.

---

### Feature 2: Zone-Based Community Trust Score
Workers in the same delivery zone share a collective trust score based on their zone's claims history.

```
Zone Trust Score ↑ → Premium ↓ + Faster payouts + Reduced verification
Zone Fraud ↑      → Premium ↑ + Stricter validation
```

- Low-fraud zones unlock: −5% premium discount for all members + priority payout processing
- High-fraud zones: slight premium increase + mandatory soft-flag check on all claims

Creates a **self-regulating ecosystem** — workers in the same zone have a collective financial incentive not to defraud, because it affects everyone's premium and payout speed.

---

### Feature 3: Earnings Continuity Bridge
Workers in EDZ ≥ 0.90 events receive an **instant ₹50 bridge payment credited within 10 minutes** — before full payout processing completes.

> The worker stranded in a flood doesn't need ₹200 in 2 hours. They need ₹50 in 10 minutes for a meal, water, or transport to safety.

Full payout follows in the standard 2-hour window. The bridge is a psychological and practical safety signal — money arrives before the worker starts worrying.

---

### Feature 4: Adaptive Liquidity Management

```
Max Event Payout = Pool Balance × 0.40

If total triggered claims > Max Event Payout:
  → Pro-rata distribution to all affected workers
  → Remaining payout logged as deferred liability
  → Auto-recovered from next week's premium inflows
  → Workers notified with exact recovery timeline
```

Pool health is visible in the worker's app — full transparency, zero surprises. Prevents insolvency without silently shorting workers.

---

### Feature 5: Income Floor Guarantee *(New — User-First Protection)*
Ensures a worker never falls below a guaranteed weekly income threshold, regardless of how many disruption events occurred.

```
If Weekly Earnings < Guaranteed Floor Threshold:
    FlowFix pays the difference

Example:
  Murugan's expected weekly earnings:  ₹4,000
  Actual earnings after disruptions:   ₹2,800
  FlowFix pays:                      ₹1,200
```

**Why this is different:** Standard parametric insurance pays per trigger event. The Income Floor Guarantee is a *weekly safety net* — it looks at the full week and ensures cumulative losses are covered even if no single disruption crossed an individual threshold.

This converts FlowFix from a trigger-based insurance product into a **weekly income stability system**.

---

### Feature 6: Hyperlocal Reality Index (Zone Intelligence Layer)
Every delivery zone gets a real-time **Livability Score (0–100)** updated every 15 minutes, combining:

```
Zone A (Low-lying) → 22  (Severe disruption — avoid)
Zone B (Urban core) → 65  (Moderate — proceed with caution)
Zone C (Elevated)  → 80  (Safe — good earning conditions)
```

**Score inputs:** Weather severity × 0.35 + Delivery activity level × 0.25 + Traffic conditions × 0.20 + Active worker presence × 0.20

**What it enables:**
- Workers make informed zone-switching decisions before wasting travel time
- The app suggests nearby safer zones with estimated earning potential
- Visualized as a live heatmap in the worker dashboard

This is the **EDZ engine made visible and actionable** — workers don't just get compensated after a bad event, they can *avoid* the bad event entirely.

---

### Feature 7: Explainable AI Payout System *(New — Trust & Transparency Layer)*
Every payout comes with a full, plain-language breakdown — no black box:

```
Your payout: ₹230

Breakdown:
  Rain severity impact    → ₹120
  Peak-hour disruption    → ₹80
  Zone intensity factor   → ₹30

Triggered by:
  ✅ IMD Red Alert confirmed
  ✅ Platform orders dropped 68% in your zone
  ✅ 71% of nearby riders went offline
```

**Why this matters:**
- Workers understand exactly what they're being paid and why
- Builds trust that the system is fair, not arbitrary
- Creates an audit trail for dispute resolution
- Satisfies ethical AI and regulatory transparency requirements

Workers who understand their payout are more likely to renew. Transparency is retention.

---

### Feature 8: AI Risk Coaching Engine *(New — Behavior Optimization)*
Personalized weekly insights delivered to the worker, focused on income optimization:

```
⚠️ You lost ₹320 last week due to working during the heatwave peak (12–3 PM)

💡 Suggested schedule adjustment:
   Start shift at 7 AM instead of 11 AM
   → Expected weekly gain: +₹180

📍 Zone recommendation:
   Adjacent Zone B showed 40% higher order density last Tuesday
   → Consider shifting 2 sessions there this week
```

**What the model analyzes:**
- Worker's earnings vs. timing over 8 weeks
- Zone-level order density by time-of-day
- Disruption patterns correlated with shift schedules
- Peer earnings benchmarking (anonymized)

**The philosophical shift:**
- ❌ Old insurance model: you lose income → we compensate
- ✅ FlowFix model: we predict the loss → coach you to avoid it → compensate what's unavoidable

This moves FlowFix from **loss compensation** to **income optimization**. Workers who use the coaching feature earn more even without triggering a claim — which builds loyalty and reduces churn.

---

## 11. 💸 Hybrid Fairness Payout Model

```
Final Payout = max(Fixed Base Payout, AI-Predicted Income Loss)
```

**Why this is fairer:**

| Worker | Fixed Payout | AI-Predicted Loss | Final Payout |
|---|---|---|---|
| Murugan (high earner, peak hours) | ₹200 | ₹480 | **₹480** ✅ |
| Priya (part-time, off-peak hours) | ₹200 | ₹90 | **₹200** ✅ |
| New worker (no earnings history) | ₹200 | Zone avg used | **₹200** ✅ |

- High earners disrupted during peak hours get compensated for their actual loss
- Low earners always receive the minimum fixed payout as a floor
- New workers with no earnings history use zone-average income as baseline

---

## 12. 📊 Insurer Analytics Dashboard

| Metric | Description |
|---|---|
| Live EDZ Map | Heatmap of all zones — current EDZ scores (green/yellow/red) |
| Claim Velocity Monitor | Claims/hour vs. 4-week avg — Surge Shield alert at >3x |
| Liquidity Pool Health | Balance, projected 7-day exposure, reserve ratio |
| TrustScore Distribution | Fraud flag rate, % resolved genuine, % confirmed fraud |
| Premium vs. Payout Ratio | Rolling 4-week actuarial health (target: >2.5:1) |
| False Positive Tracker | Appeals filed, resolved genuine — monitors model fairness |
| Zone Trust Score Map | Community trust heatmap by delivery zone |
| Income Floor Activations | How often the floor guarantee triggered vs. event triggers |

---

## 13. 🏗️ Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Web Frontend | React + Vite + TailwindCSS | Fast, modern web application for workers |
| Backend API | Django (Python) | Robust framework for complex logic and API delivery |
| Database | PostgreSQL + Redis (via Daphne/Channels) | Scalable data storage and real-time WebSockets |
| ML Models | Python + Scikit-learn / XGBoost | Integrated directly or via microservices |
| Real-time Engine | Django Channels | Handles real-time telemetry and EDZ updates natively |
| Weather | IMD API (primary) + OpenWeatherMap | IMD most accurate for Indian hyperlocal data |
| Traffic Data | Google Maps Traffic API (mock) | Detects road closures, congestion for zone accessibility |
| Civic Alerts | NDMA API + Google Maps Road Closures | Dual-source civic disruption confirmation |
| Platform Mock | Simulated REST API + Mock Data | Mimics platform order volume + operational status |
| Payments | Razorpay UPI (sandbox) | Best UPI rails for instant gig worker payouts |
| Notifications | WhatsApp Business API (Meta) | Higher open rate than SMS among gig workers |
| Dashboard | React + Plotly/Recharts | High-performance visualization in the frontend |

---

## 14. 📁 Repository Structure

```text
FlowFix-app/                  # React (Vite) Frontend
├── src/
│   ├── components/             # Reusable UI components (IntelligenceGrid, etc.)
│   ├── pages/                  # Main views (Dashboard, Claims, Profile)
│   ├── context/                # Global state management
│   ├── config/                 # Environment and API configurations
│   └── utils/                  # Helper functions
├── public/                     # Static assets
└── vite.config.js              # Vite configuration

FlowFix/                      # Django Backend
├── apps/                       # Organized Django applications
│   ├── analytics/              # Real-time dashboard data and EDZ scoring
│   ├── claims/                 # Disruption detection & claim processing
│   ├── monitoring/             # Telemetry & GPS tracking system
│   ├── payouts/                # Razorpay and ledger management
│   ├── policies/               # Weekly coverage and premium logic
│   └── users/                  # Custom gig worker profiles & KYC
├── FlowFix/                  # Core Django project settings
│   ├── asgi.py                 # Daphne ASGI configuration
│   ├── settings.py             # Main configuration
│   ├── urls.py                 # Core routing
│   └── api_urls.py             # Unified API routing
├── monitoring_handbook.md      # Telemetry docs
├── run_daphne.ps1              # Script to run async server
└── manage.py                   # Django execution
```

---

## 15. 🗓️ Development Roadmap

### Phase 1 — Ideation & Foundation ✅ (Current)
- [x] Problem research + persona definition
- [x] EDZ architecture + anti-spoofing strategy
- [x] Pricing model + parametric trigger design
- [x] Full feature architecture
- [ ] Mock API server (Platforms, IMD, NDMA, CPCB, Razorpay)
- [ ] Synthetic training dataset generation

### Phase 2 — Core Build
- [ ] Worker onboarding (KYC + Platform ID + zone detection)
- [ ] 3-layer premium calculation engine
- [ ] EDZ engine with 5-signal aggregation (mock data)
- [ ] Auto-trigger → UPI payout pipeline
- [ ] Earnings Continuity Bridge (₹50 instant advance)

### Phase 3 — Intelligence Layer
- [ ] TrustScore fraud detection model
- [ ] Income Loss Prediction model (hybrid payout)
- [ ] Income Floor Guarantee engine
- [ ] Smart Work Advisory (48hr forecast)
- [ ] Hyperlocal Reality Index (Livability Map)
- [ ] Explainable AI payout breakdown

### Phase 4 — Optimization & Demo
- [ ] AI Risk Coaching engine (personalized insights)
- [ ] Zone Community Trust Score system
- [ ] Fraud Surge Shield mode
- [ ] Insurer analytics dashboard
- [ ] End-to-end demo: Murugan's Indian monsoon scenario
- [ ] Final documentation + presentation

---

## 16. 🚫 Explicitly Out of Scope

- ❌ Vehicle repair or maintenance payouts
- ❌ Health insurance or accident medical bills
- ❌ Life insurance or disability coverage
- ❌ Monthly pricing (all premiums are **weekly only**)

---

## 17. 📌 Why FlowFix Wins

| Dimension | Generic Solution | FlowFix |
|---|---|---|
| Trigger | City-level weather API | Hyperlocal 5-signal EDZ engine |
| Fraud defense | GPS verification | Behavioral DNA + syndicate graph detection |
| Claim process | Worker files a form | Fully automatic — zero action needed |
| Payout fairness | Fixed amount | max(fixed, AI-predicted actual loss) |
| Income protection | Per-event payout | Weekly Income Floor Guarantee |
| Payout speed | 24–72 hours | ₹50 bridge in 10 min + full payout in 2 hrs |
| Transparency | No explanation | Explainable AI breakdown per rupee |
| Worker value | Passive insurance | Income protection + optimization + coaching |
| Anti-spoof | GPS check | 4 non-spoofable signals required |
| Community | Individual policy | Zone Trust Score with collective incentives |

FlowFix is not just insurance.
It is a real-time income protection and optimization system built for workers who cannot afford uncertainty.

By combining:
Hyperlocal AI risk detection
Fraud-resilient trust architecture
Instant liquidity support
Predictive income coaching
FlowFix transforms insurance from a reactive payout system into a proactive financial safety net.

> In a country where millions live week-to-week, FlowFix ensures that a bad day doesn’t become a bad week.
---

*Built by Team CodeStorm for Guidewire DEVTrails 2026 — "AI-Powered Insurance for India's Gig Economy"*
*Persona: All Delivery & Gig Economy Partners | Primary Zone: Pan-India*

---

## 18. 🚀 Running Locally & Dependencies

This system operates as a separated frontend (React) and backend (Django). Both need to be running concurrently for the application to function.

### Prerequisites & Dependencies
- **Node.js** (v18+) and npm
- **Python** (v3.10+)
- **Frontend Dependencies:** React 18, Vite, TailwindCSS, React Router DOM, Recharts
- **Backend Dependencies:** Django 5.0, Django REST Framework, Django Channels (WebSockets for real-time telemetry), Celery (async tasks), PostgreSQL/SQLite3 (local dev uses SQLite by default)
- **Payments / Razorpay:** `razorpay==1.4.1` is already included in `requirements.txt`; no extra Python package is needed right now for the current backend-led payout flow.
- **Razorpay Environment Variables:** `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must be set in the backend environment before enabling live payment processing.
- **Frontend Payment Note:** the current React app does not require a separate npm payment package yet. If a browser-side Razorpay checkout is added later, it will need the official Razorpay checkout script or a thin wrapper, not a new backend dependency.

### Important Local Notes
- Run backend and frontend in separate terminals.
- Apply backend migrations before starting the server after any model change.
- Use `python manage.py seed_gigshield --city=Chennai` if demo users are missing.
- Login uses `platform_id`, not phone number.
- For local payment testing, leave Razorpay keys blank unless you are intentionally testing live payments.
- If WebSockets do not connect, use Daphne/Channels instead of plain `runserver`.

### 1. Setting up the Backend (Django)

Open a terminal and execute the following:

```bash
# Navigate to the backend directory
cd gigshield

# Create and activate a virtual environment (recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install all required Python dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```
The backend API will now be running at `http://localhost:8000`.

### 2. Setting up the Frontend (Vite + React)

Open a **new** terminal window and execute the following:

```bash
# Navigate to the frontend application directory
cd gigshield-app

# Install all required Node packages
npm install

# Start the Vite development server
npm run dev
```
The frontend dashboard will now be running at `http://localhost:5173`. Open this URL in your browser to view the application!
