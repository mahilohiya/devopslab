# Security and Quality Tools

This project includes configuration for SonarQube, OWASP Dependency Check, and Docker.

## Docker

To run the entire application stack (Frontend, Backend, and SonarQube), use Docker Compose:

```bash
docker-compose up -d
```

- Frontend will be available at `http://localhost:3000`
- Backend will be available at `http://localhost:8000`

## Jenkins (Local)

1. Start your local Jenkins instance (usually available at `http://localhost:8080`).
2. Create a new Pipeline job and point it to the `Jenkinsfile` in this repository.

## SonarQube (Local)

1. Start your local SonarQube instance (usually available at `http://localhost:9000`).
2. Generate a new token in SonarQube (My Account -> Security -> Generate Tokens).
3. Edit `run-sonar-scanner.sh` and replace `sqa_your_token_here` with your generated token.
4. Run the scanner:
   ```bash
   ./run-sonar-scanner.sh
   ```
5. View the results in your local SonarQube dashboard.

## OWASP Dependency Check

We use the official OWASP Dependency Check Docker image to scan the project dependencies for known vulnerabilities.

To run the scan:

```bash
./run-owasp.sh
```

The first run might take a while as it downloads the vulnerability database.
Once completed, the reports will be generated in the `odc-reports` directory in various formats (HTML, JSON, XML). Open `odc-reports/dependency-check-report.html` in your browser to view the results.
