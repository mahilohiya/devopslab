#!/bin/bash

# Make sure SonarQube is running first (via docker-compose up -d sonarqube)
# You may need to wait a minute for SonarQube to fully start up on port 9000

# Default SonarQube URL and Token (you should generate a token in SonarQube UI)
SONAR_HOST_URL="http://localhost:9000"
# Replace with your actual token after creating it in SonarQube
SONAR_TOKEN="sqa_your_token_here"

echo "Running SonarScanner..."

docker run \
    --rm \
    -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
    -e SONAR_LOGIN="${SONAR_TOKEN}" \
    -v "$(pwd):/usr/src" \
    --network host \
    sonarsource/sonar-scanner-cli

echo "SonarScanner completed."
