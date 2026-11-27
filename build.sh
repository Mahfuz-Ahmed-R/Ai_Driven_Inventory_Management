#!/usr/bin/env bash
set -o errexit

# Build React frontend
npm --prefix frontend ci
npm --prefix frontend run build

# Install Python backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# Collect Django static files and apply database migrations
python backend/manage.py collectstatic --noinput
python backend/manage.py migrate --noinput
