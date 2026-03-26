#!/usr/bin/env bash
set -euo pipefail
sudo zcat -f /var/log/nginx/access.log* | sudo goaccess - --log-format=COMBINED -o /srv/reports/report.html
sudo chown www-data:www-data /srv/reports/report.html
sudo chmod 644 /srv/reports/report.html
echo "Report updated: $(date)"
