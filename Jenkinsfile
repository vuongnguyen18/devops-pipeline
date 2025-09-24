pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  parameters {
    booleanParam(name: 'GO_PROD', defaultValue: false, description: 'Also deploy prod on 8082')
  }

  environment {
    STAGING_PORT = '8081'
    PROD_PORT    = '8082'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build (Node)') {
      steps { bat 'npm --prefix app ci || npm --prefix app install' }
    }

    stage('Test') {
      steps { bat 'npm --prefix app test' }
      post {
        always {
          junit 'app\\junit.xml'
          publishHTML(target: [reportDir: 'app\\coverage\\lcov-report', reportFiles: 'index.html', reportName: 'Coverage'])
        }
      }
    }

    stage('Docker Build') {
      steps { bat 'docker build -t devops-starter:staging .' }
    }

    stage('Deploy: Staging (Compose)') {
      steps {
        bat 'docker compose -f docker-compose.staging.yml up --build -d --remove-orphans'
        bat '.\\scripts\\smoke_test.cmd http://localhost:%STAGING_PORT%/health 30'
      }
    }

    stage('Release: Production (Compose)') {
      when { expression { return params.GO_PROD } }
      steps {
        bat 'docker compose -f docker-compose.prod.yml up --build -d --remove-orphans'
        bat '.\\scripts\\smoke_test.cmd http://localhost:%PROD_PORT%/health 30'
      }
    }
  }
}
