#!/bin/bash

# OWASP Dependency Check - runs via Docker
# Reports saved to ./odc-reports/

DC_VERSION="latest"
DATA_DIRECTORY="$HOME/OWASP-Dependency-Check/data"
CACHE_DIRECTORY="$HOME/OWASP-Dependency-Check/data/cache"
REPORT_DIR="$(pwd)/odc-reports"

mkdir -p "$DATA_DIRECTORY" "$CACHE_DIRECTORY" "$REPORT_DIR"

# Pull latest image
docker pull owasp/dependency-check:$DC_VERSION

docker run --rm \
    -v "$(pwd):/src:z" \
    -v "$DATA_DIRECTORY":/usr/share/dependency-check/data:z \
    -v "$REPORT_DIR":/report:z \
    owasp/dependency-check:$DC_VERSION \
    --scan /src \
    --format "HTML" \
    --format "JSON" \
    --project "DevOps Monitor" \
    --out /report \
    --disableAssembly \
    --disableNodeAudit \
    --nvdApiKey "e6fca2d1-0c7e-4b53-8f7f-6cff9e0e85e9"

echo ""
echo "OWASP Dependency Check completed."
echo "Open odc-reports/dependency-check-report.html to view results."
