# Submission pack

## LINKS

GitHub repository: REPO_URL_HERE
Deployed app: DEMO_URL_HERE

## ASSUMPTIONS / MOCKED DATA / NOTES

The app has one default logged-in creator and no real authentication. SQLite is used for the demo; a free-tier disk is ephemeral, so data resets on redeploy, and startup auto-seeds the demo only when there are no forms. The clean seed contains Customer Feedback Survey (feedback001, published, 8 question types, 25 responses), Event Registration (eventReg01, published, 12 responses), and Job Application (jobapply1, draft, 6 questions, 0 responses). Workflow, Connect/integrations, logic UI, theme/design panel, spam tab, tags, Smart Insights, email embed, payment questions, file-upload questions, and link-preview customisation are Coming soon. Edits autosave and go live immediately; there is no separate Publish edits step. Every form has one thank-you ending. The public submit limiter is in memory per process. To test, open feedback001, answer its questions, press OK or Enter to advance, and open Results to view the response and export it. On a free-tier deployment the first request may take about 50 seconds while the service wakes.

## How to review in 3 minutes

1. Open the deployed app.
2. Open the published Customer Feedback Survey.
3. Submit the form using the one-question-at-a-time flow.
4. Open Results and inspect the response summary and response drawer.
5. Use Export to download CSV or XLSX.
