environment { STAGING_PORT = '8081' } 

pipeline {
  agent any
  options { timestamps(); ansiColor('xterm'); disableConcurrentBuilds() }
  parameters {
    booleanParam(name: 'FULL', defaultValue: false, description: 'Enable full pipeline (Sonar/Trivy/Registry push) later')
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build (Node)') {
      steps {
        sh '''
          npm --prefix app ci
        '''
      }
    }
    stage('Test') {
      steps {
        sh '''
          npm --prefix app test
        '''
      }
      post {
        always {
          junit 'app/junit.xml'
          publishHTML(target: [reportDir: 'app/coverage/lcov-report', reportFiles: 'index.html', reportName: 'Coverage'])
        }
      }
    }
    stage('Docker Build') {
      steps {
        sh 'docker build -t devops-starter:local .'
      }
    }
    stage('Deploy: Staging (Compose)') {
      steps {
        sh 'docker compose -f docker-compose.staging.yml up -d --build --remove-orphans'
        sh './scripts/smoke_test.sh http://localhost:${STAGING_PORT}/health 30'
      }
    }
    stage('Placeholders (Quality & Security)') {
      steps {
        echo 'Add SonarQube + Quality Gate + Trivy here (coming next).'
      }
    }
  }
  post {
    always {
      cleanWs(deleteDirs: false, notFailBuild: true)
    }
  }
}
