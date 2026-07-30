# Filing Request Submission Module

A customs broker filing intake tool — brokers submit invoice + shipment
details for a filing, see all filings in a ledger, and push a filing on to
the (simulated) EDI system. Built for the Neximprove Full Stack Intern task
(Task Option 2).

## Architecture

```
frontend (React + Vite)  --HTTP/JSON-->  backend (FastAPI)  -->  SQLite
        Filing Desk UI                    /filings CRUD API      filings.db
                                           /filings/{id}/submit
                                                 |
                                                 v
                                     webhook.py (simulated EDI trigger)
```

**Backend — FastAPI + SQLAlchemy + SQLite**
- `app/models.py` — the `Filing` ORM model: `id` (UUID), `shipment_id`,
  `invoice_no`, `port`, `value`, `items` (JSON-encoded line items),
  `status` (`draft` → `submitted` → `acknowledged`), `submission_date`.
- `app/schemas.py` — Pydantic request/response models. All validation
  (required fields, positive values, non-empty item list) happens here,
  before a request ever reaches the database.
- `app/main.py` — REST endpoints: `POST/GET /filings`, `GET/PUT/DELETE
  /filings/{id}`, and `POST /filings/{id}/submit`.
- `app/webhook.py` — the bonus "simulate webhook trigger on submit." Logs
  a structured payload and returns a fake EDI reference, in the shape a
  real outbound webhook call would use (swap-in point is commented in
  the file).

**Frontend — React + Vite**
- `src/App.jsx` — single-page UI: a filing form on the left (with dynamic
  line items) and a ledger table on the right that lists every filing and
  lets you push a `draft` filing to `submitted`.
- `src/api.js` — thin fetch wrapper for the backend; the base URL is
  configurable via `VITE_API_URL` so the same build works against any
  backend deployment.
- Client-side validation mirrors the backend's rules so users get instant
  feedback, but the backend re-validates independently — client checks
  are a UX convenience, never the source of truth.

## Why SQLite, not Postgres

The task brief says "Save to PostgreSQL" for the *other* task option; this
option's brief only asks for backend storage + list view. SQLite needs zero
setup and is a drop-in swap for Postgres later — only `database.py`'s
`SQLALCHEMY_DATABASE_URL` changes. Worth mentioning in the interview if
asked why.

## Security & data handling notes

- All inputs are validated server-side via Pydantic (type, length, and
  value constraints) before touching the database — this is what stops
  malformed or malicious payloads regardless of what the frontend sends.
- SQLAlchemy's ORM parameterizes every query, so there's no raw string
  concatenation into SQL — this is what prevents SQL injection here.
- CORS is restricted to the known local dev origins rather than left
  wildcard-open.
- No secrets or credentials are involved in this MVP (no auth layer was
  in scope for this task), so nothing sensitive sits in the repo. If this
  went further, the natural next step would be broker authentication +
  row-level scoping so brokers only see their own filings.

## Running it locally

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000  (interactive API docs at /docs)
```

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173
```

## API summary

| Method | Path                    | Purpose                                  |
|--------|--------------------------|-------------------------------------------|
| GET    | `/filings`               | List all filings                         |
| POST   | `/filings`                | Create a filing                          |
| GET    | `/filings/{id}`           | Get one filing                           |
| PUT    | `/filings/{id}`           | Update a filing                          |
| DELETE | `/filings/{id}`           | Delete a filing                          |
| POST   | `/filings/{id}/submit`    | Mark submitted, fire simulated EDI webhook |

A ready-to-import Postman collection is in `postman/Filing-Module.postman_collection.json`.

## What's not done / possible next steps

- No authentication — every broker sees every filing (fine for this task's
  scope, would need real auth to match Task Option 1's approach).
- Items are stored as a JSON blob on the filing row rather than a
  normalized child table — fine at this scale, would split out for
  reporting/analytics later.
- No pagination on `GET /filings` — fine for a demo dataset, would add
  before this saw production-sized data.
