# Database migrations

This directory contains incremental SQL migrations for the operational LMS schema.

## Naming convention

Use:

`V<version>__<description>.sql`

Examples:
- `V0001__baseline_schema.sql`
- `V0002__add_feedback_sentiment_index.sql`

## Rules

- Versions are strictly increasing.
- Migrations are append-only and immutable once released.
- New environments bootstrap from `db/schema.sql`.
- Existing environments apply outstanding files from this directory in order.
