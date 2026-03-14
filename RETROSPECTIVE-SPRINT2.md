# Sprint 2 Retrospective — DevPulse
Date: March 14, 2026

## What we built
- Slack alerts firing on warning/critical metrics
- NoSQL injection protection (OWASP A03)
- Live Jira velocity chart with real sprint data

## What went well
- Slack webhook integration worked cleanly
- Jira API connected to real project data
- Dashboard now shows full team health picture

## What was hard
- Jira API path needed debugging (trailing slash, wrong base path)
- MongoDB data loss on server restart — fixed with persistent Docker volume

## What to do differently in Sprint 3
- Start Docker MongoDB with persistent volume from day one
- Test API endpoints with curl before wiring into frontend

## Sprint 2 velocity
- Stories completed: 4/4 (100%)
