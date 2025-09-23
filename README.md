# DevOps Pipeline Starter (Jenkins)

Production-minded starter repo for your SIT223/SIT753 assignment. It includes:
- Minimal Node.js API with `/health`, `/metrics`, and `/error` endpoints
- Jest unit test with coverage
- Dockerfile and docker-compose for staging/prod
- Jenkinsfile (starter) that runs **Checkout → Build → Test → Docker Build → Deploy: Staging → Smoke Test**
- Hooks to expand later (SonarQube, Trivy, SBOM, prod release)

## Local quickstart
```bash
# Run tests
npm --prefix app ci
npm --prefix app test

# Run app locally without Docker
npm --prefix app start

# Or run with Docker Compose (staging)
docker compose -f docker-compose.staging.yml up --build -d
curl -sf http://localhost:8080/health
curl -sf http://localhost:8080/metrics | head
```

## Jenkins
Create a Pipeline job pointing to this repo (Pipeline script from SCM). This starter Jenkinsfile avoids external credentials.
Later, enable FULL mode and add SonarQube/Trivy/Push once your tooling is configured.
