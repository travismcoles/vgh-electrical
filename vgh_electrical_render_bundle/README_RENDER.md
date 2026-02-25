# VGH Electrical — Render Deployment Bundle

This repository contains a production-ready Flask app configured for **Render.com**.

## What's included
- Full Flask source (`app/`, `templates/`, `data/`, `scripts/`)
- `Dockerfile` for a containerized build
- `render.yaml` for one-click deployment on Render
- `gunicorn.conf.py` for production WSGI serving
- `requirements.txt`

## Environment variables
On Render, set the following **Environment Variables** (Dashboard → your service → Environment):

- `FLASK_ENV=production`
- `SECRET_KEY` = a long random string
- (Optional) `DATABASE_URL` — leave empty to use local SQLite (`instance/app.db`). To use PostgreSQL on Render, create a Render PostgreSQL add-on and use its Internal DB URL.

## Admin user
Once deployed, open the Render shell (Logs → Shell) and run:
```
python scripts/create_admin.py
```
Enter your admin email and password when prompted.

## Run locally (optional)
```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=app
flask db upgrade
flask run
```
