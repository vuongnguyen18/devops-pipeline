pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

parameters {
  booleanParam(name: 'GO_PROD', defaultValue: false, description: 'Also deploy prod on 8082')
  booleanParam(name: 'SECURITY_ENFORCE', defaultValue: false, description: 'Fail build on HIGH/CRITICAL findings')
}

  environment {
    STAGING_PORT = '8083'   // you moved staging to 8083
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
          archiveArtifacts artifacts: 'app/coverage/lcov-report/**', allowEmptyArchive: true, fingerprint: true
        }
      }
    }

    stage('Code Quality (SonarQube)') {
  steps {
    withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN')]) {
      bat """
      docker run --rm ^
        -e SONAR_HOST_URL=http://host.docker.internal:9000 ^
        -e SONAR_TOKEN=%SONAR_TOKEN% ^
        -v "%cd%":/usr/src ^
        sonarsource/sonar-scanner-cli:5
      """
    }
  }
}


    stage('Docker Build') {
      steps { bat 'docker build -t devops-starter:staging .' }
    }

   stage('Pre-clean Ports') {
  steps {
    bat '''
    @echo off
    rem -- Free anything bound to STAGING_PORT and PROD_PORT; ignore errors
    for /f %%i in ('docker ps -q --filter "publish=%STAGING_PORT%"') do (
      echo Freeing %STAGING_PORT% from %%i
      docker stop %%i >nul 2>nul || rem ignore
      docker rm   %%i >nul 2>nul || rem ignore
    )
    for /f %%i in ('docker ps -q --filter "publish=%PROD_PORT%"') do (
      echo Freeing %PROD_PORT% from %%i
      docker stop %%i >nul 2>nul || rem ignore
      docker rm   %%i >nul 2>nul || rem ignore
    )
    exit /b 0
    '''
  }
}

stage('Security: Trivy (FS)') {
  steps {
    script { env.TRIVY_EXIT = params.SECURITY_ENFORCE ? '1' : '0' }
    bat 'if not exist .trivy-cache mkdir .trivy-cache'
    bat """
    docker run --rm ^
      -v "%cd%":/src ^
      -v "%cd%\\.trivy-cache":/root/.cache/trivy ^
      aquasec/trivy:0.54.1 fs /src ^
      --scanners vuln,misconfig,secret ^
      --ignore-unfixed ^
      --skip-dirs /src/app/node_modules,/src/.git,/src/app/coverage ^
      --severity HIGH,CRITICAL ^
      --format table ^
      --output /src/trivy-fs.txt ^
      --exit-code %TRIVY_EXIT%
    """
  }
  post { always { archiveArtifacts artifacts: 'trivy-fs.txt', onlyIfSuccessful: false } }
}

stage('Security: Trivy (Image)') {
  steps {
    script { env.TRIVY_EXIT = params.SECURITY_ENFORCE ? '1' : '0' }
    bat """
    docker run --rm ^
      -v //var/run/docker.sock:/var/run/docker.sock ^
      -v "%cd%\\.trivy-cache":/root/.cache/trivy ^
      -v "%cd%":/out ^
      aquasec/trivy:0.54.1 image devops-starter:staging ^
      --ignore-unfixed ^
      --severity HIGH,CRITICAL ^
      --format table ^
      --output /out/trivy-image.txt ^
      --exit-code %TRIVY_EXIT%
    """
  }
  post { always { archiveArtifacts artifacts: 'trivy-image.txt', onlyIfSuccessful: false } }
}


// ---------- SBOM (CycloneDX) from the built image ----------
stage('SBOM (CycloneDX)') {
  steps {
    bat """
    docker run --rm ^
      -v //var/run/docker.sock:/var/run/docker.sock ^
      -v "%cd%":/out ^
      aquasec/trivy:0.54.1 sbom devops-starter:staging ^
      --format cyclonedx ^
      --output /out/sbom.cdx.json
    """
  }
  post { always { archiveArtifacts artifacts: 'sbom.cdx.json', onlyIfSuccessful: false } }
}


    stage('Deploy: Staging (Compose)') {
  steps {
    bat '''
    docker compose -f docker-compose.staging.yml up --build -d --remove-orphans
    for /L %%i in (1,1,30) do (
      curl.exe -sf http://localhost:%STAGING_PORT%/health >nul 2>&1 && (echo Smoke test OK & exit /b 0)
      ping -n 2 127.0.0.1 >nul
    )
    echo Smoke test FAILED & exit /b 1
    '''
  }
}

    stage('Release: Production (Compose)') {
  when { expression { return params.GO_PROD } }
  steps {
    bat '''
    docker compose -f docker-compose.prod.yml up --build -d --remove-orphans
    for /L %%i in (1,1,30) do (
      curl.exe -sf http://localhost:%PROD_PORT%/health >nul 2>&1 && (echo Smoke test OK & exit /b 0)
      ping -n 2 127.0.0.1 >nul
    )
    echo Smoke test FAILED & exit /b 1
    '''
  }
}
  }
}
