# UI Design Direction

## Final Direction

The selected UI direction is approved as the Good Rapido visual baseline.

The style should feel:

- Transparent
- Trust-first
- Calm but premium
- Operationally useful
- Safety-aware
- Fare-focused
- Route/fairness focused

This is not a generic ride-booking UI. The product should visually prove that Good Rapido is different from black-box ride apps.

---

## Core Visual Personality

Good Rapido should look like a transparent mobility product with strong trust signals.

The reference screens are directionally correct because they show:

- Fare confidence
- Surge explanation
- Driver trust score
- Route fairness
- Payment clarity
- Safety support
- User control

These are the right product signals.

---

## Color System

### Primary Colors

```text
Mint / Teal: #63EBD5
Deep Teal: #008C7A
Dark Navy: #071F35
Ink Text: #071A2F
Soft Background: #F4F7FA
Card White: #FFFFFF
Muted Text: #667085
```

### Semantic Colors

```text
Success: #00A86B
Warning: #F59E0B
Danger: #D92D20
Info: #2563EB
Soft Mint Surface: #E9FFFA
Soft Red Surface: #FFF0EF
Soft Gray Surface: #F1F3F6
```

### Usage Rules

- Use mint/teal for trust, selected states, positive guidance, and primary navigation.
- Use dark navy for primary CTAs, fare cards, and high-importance panels.
- Use red only for real warnings: surge, emergency, fraud, unusual fare, disputes.
- Use soft gray for neutral cards and input containers.
- Do not make the entire app one color. Use contrast between mint, navy, white, gray, and semantic warning colors.

---

## Typography

Recommended type style:

- Headings: bold, compact, high contrast.
- Body text: readable, medium weight, no excessive letter spacing.
- Labels: uppercase only for small metadata like PICKUP, DROP-OFF, BASE FARE.
- Numbers: large and clear for fare, score, multiplier, ETA.

Suggested scale:

```text
Screen title: 18-22px, 700
Section title: 18-20px, 700
Card title: 15-17px, 700
Body: 13-15px, 400-500
Metadata label: 10-12px, 700
Hero number: 38-56px, 800
```

---

## Shape and Layout

### Radius

Use consistent radius.

```text
Small controls: 8px
Cards: 12px
Bottom sheets: 24px top corners
Circular avatars/icons: 999px
```

### Spacing

```text
Screen padding: 16-20px
Card padding: 16-20px
Section gap: 16-24px
Compact row gap: 8-12px
```

### Shadows

Use soft shadows only.

```text
Card shadow: 0 10px 30px rgba(7, 31, 53, 0.08)
Heavy panel shadow: 0 16px 40px rgba(7, 31, 53, 0.16)
```

---

## Navigation

For rider MVP, use simple bottom navigation:

- Home
- History
- Profile

Context screens can add back navigation:

- Fare Estimate
- Confirm Ride
- Driver Profile
- Safety & Help

The bottom nav should be persistent on main rider screens.

---

## Core Screen Patterns

## Home

Purpose:

Let users choose pickup/dropoff and start booking quickly.

Must show:

- Map background
- Fair price / accuracy badges
- Pickup card
- Drop-off card
- Vehicle options
- Bottom navigation

## Fare Estimate

Purpose:

Explain the fare before the user books.

Must show:

- Estimated total
- Fare confidence
- Demand/surge explanation
- Smart pickup tip
- Detailed fare breakdown
- Historical range
- Lock fare action
- Book ride action

## Confirm Ride

Purpose:

Confirm route, fare lock, driver, trust, and payment method.

Must show:

- Route preview
- Pickup/dropoff
- Fare lock timer
- Driver card
- Route fairness
- Cancellation risk
- Safety shield
- Payment method
- Confirm booking CTA

## Driver Profile

Purpose:

Show why this driver is trustworthy.

Must show:

- Driver photo/avatar
- Rating
- Trust score
- Rides completed
- Cleanliness/reliability
- Avg fare/km
- Route fairness
- Detour percentage
- Cancellation ratio
- Risk score
- Verified safe profile

## Route Fairness

Purpose:

Prove that route and fare are fair.

Must show:

- Expected route vs actual route
- Route accuracy score
- Detour percentage
- Fairness lock
- Efficiency analysis
- Traffic optimization
- Fare integrity guarantee

## Surge

Purpose:

Explain why prices are higher.

Must show:

- Current surge multiplier
- High demand area
- Driver availability
- Traffic update
- Why surge exists
- Lock price timer

## History

Purpose:

Help user review fares and detect anomalies.

Must show:

- Monthly fare average
- Fare consistency chart
- Recent rides
- Unusual fare detection
- Confidence badges
- Investigate action

## Safety & Help

Purpose:

Make support and emergency action obvious.

Must show:

- Safety shield status
- SOS button
- Issue categories
- Refund/dispute timeline
- Call support
- WhatsApp support

## Profile

Purpose:

User account, saved addresses, emergency contacts, preferences.

Must show:

- Profile card
- Verified profile
- Saved addresses
- Emergency contacts
- Accessibility options
- Notification preferences
- Security/privacy card

---

## Component System

Core components:

```text
AppHeader
BottomNav
MapPreview
TrustBadge
ScoreBadge
FareBreakdown
SurgeAlert
SmartTip
DriverCard
RouteAccuracyCard
PaymentMethodRow
SafetyShield
HistoryRideCard
IssueActionRow
ProfileCard
PreferenceRow
PrimaryButton
SecondaryButton
StatusBadge
```

---

## Product Rules

- Always explain why something is happening.
- Never show a high fare without showing the reason.
- Never show driver matching without trust context.
- Never show route deviation without fairness explanation.
- Never show payment without refund/capture clarity.
- Never hide safety actions.
- Keep CTAs clear and visible.

---

## MVP UI Decision

The first frontend implementation should begin with the rider flow.

Build first:

```text
Home
Fare Estimate
Confirm Ride
Driver Profile
Route Fairness
Surge
History
Safety & Help
Profile
```

This proves the Good Rapido value proposition before building the driver app and ops dashboard.
