pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  parameters {
    booleanParam(name: 'USE_DOCKER',   defaultValue: true,  description: 'Build, compose, and deploy containers')
    booleanParam(name: 'GO_PROD',      defaultValue: false, description: 'Also release to production (prod compose on a different port)')
    booleanParam(name: 'SONAR_ENABLED',defaultValue: false, description: 'Run SonarQube analysis if configured')
  }

  environment {
    STAGING_PORT = '8081'   // host port mapped to container 8080
    PROD_PORT    = '8082'   // host port for prod compose
    SONAR_HOST_URL = ''     // e.g., http://localhost:9000
    SONAR_TOKEN    = ''     // create in Sonar → My Account → Tokens
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Build (Node)') {
      steps {
        sh '''
          if [ -f app/package-lock.json ]; then
            npm --prefix app ci
          else
            npm --prefix app install
          fi
        '''
      }
    }

    stage('Test') {
      steps { sh 'npm --prefix app test' }
      post {
        always {
          junit 'app/junit.xml'
          publishHTML(target: [reportDir: 'app/coverage/lcov-report', reportFiles: 'index.html', reportName: 'Coverage'])
        }
      }
    }

    stage('Code Quality (SonarQube, optional)') {
      when { expression { return params.SONAR_ENABLED && env.SONAR_HOST_URL && env.SONAR_TOKEN } }
      steps {
        sh '''
          # lightweight scanner download
          curl -sL https://github.com/SonarSource/sonar-scanner-cli/releases/latest/download/sonar-scanner-cli.zip -o ss.zip
          unzip -q -o ss.zip
          ./sonar-scanner-*/bin/sonar-scanner \
            -Dsonar.projectKey=devops-starter \
            -Dsonar.sources=app/src \
            -Dsonar.tests=app/__tests__ \
            -Dsonar.javascript.lcov.reportPaths=app/coverage/lcov.info \
            -Dsonar.host.url=$SONAR_HOST_URL \
            -Dsonar.token=$SONAR_TOKEN
        '''
      }
    }

    stage('Docker Build') {
      when { expression { return params.USE_DOCKER } }
      steps {
        sh 'docker build -t devops-starter:staging .'
      }
    }

    stage('Security (Trivy + SBOM)') {
      when { expression { return params.USE_DOCKER } }
      steps {
        sh '''
          # SBOM (Syft)
          curl -sL https://github.com/anchore/syft/releases/latest/download/syft_Linux_x86_64.tar.gz | tar xz
          ./syft devops-starter:staging -o spdx-json > sbom.json

          # Image scan (Trivy) - fail on HIGH/CRITICAL vulns
          curl -sL https://github.com/aquasecurity/trivy/releases/latest/download/trivy_Linux-64bit.tar.gz | tar xz
          ./trivy image --no-progress --exit-code 1 --severity HIGH,CRITICAL devops-starter:staging
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'sbom.json', fingerprint: true }
      }
    }

    stage('Deploy: Staging (Compose)') {
      when { expression { return params.USE_DOCKER } }
      steps {
        sh '''
          docker compose -f docker-compose.staging.yml up --build -d --remove-orphans
        '''
        sh "./scripts/smoke_test.sh http://localhost:${STAGING_PORT}/health 30"
      }
    }

    stage('Release: Production (Compose)') {
      when { expression { return params.USE_DOCKER && params.GO_PROD } }
      steps {
        sh '''
          docker compose -f docker-compose.prod.yml up --build -d --remove-orphans
        '''
        sh "./scripts/smoke_test.sh http://localhost:${PROD_PORT}/health 30"
      }
    }
  }

  post {
    always {
      echo "Done."
    }
  }
}
