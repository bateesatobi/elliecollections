# Elliecollections

Feminine fashion shopping platform — apparel & accessories — with a full admin console for catalogue uploads, orders, and revenue.

## Features

### Client
- Brand landing + shop browse (guest-friendly)
- Product detail, bag, checkout (login/register at pay)
- Pesapal / MoMo / card / cash on delivery
- Order history & tracking

### Admin
- Dashboard KPIs
- Product CRUD with multi-image upload
- Categories & units (fashion taxonomy)
- Orders, refunds, users, revenue, disbursements

## Run

```bash
cd elliecollections
npm install
npm run dev
```

Set API base URL in `.env`:

```
VITE_API_URL=https://elliecollections-api-latest.onrender.com
```

For local backend instead: `VITE_API_URL=http://localhost:8000`
## Backend

```bash
cd agrobackend
# uses config/wigi-64fa5-firebase-adminsdk-*.json
uvicorn main:app --reload --port 8000
```

Default admin: `admin@elliecollections.com` / `admin123`
