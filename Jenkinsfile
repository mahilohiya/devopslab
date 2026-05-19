pipeline {
    agent any

    environment {
        PATH = "/usr/local/bin:/opt/homebrew/bin:${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    dir('backend') {
                        sh 'docker build -t devops-monitor-backend .'
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    dir('frontend') {
                        sh 'docker build -t devops-monitor-frontend .'
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            environment {
                SONAR_TOKEN = credentials('sonarqube-token')
            }
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    echo "=== Checking SonarQube connectivity ==="
                    curl -s -o /dev/null -w "SonarQube HTTP status: %{http_code}\n" http://host.docker.internal:9000/api/system/status || echo "WARNING: Cannot reach SonarQube at host.docker.internal:9000"
                    echo "=== Running SonarQube Scanner ==="
                    docker run --rm \
                        -e SONAR_HOST_URL="http://host.docker.internal:9000" \
                        -e SONAR_LOGIN="${SONAR_TOKEN}" \
                        -v "$(pwd):/usr/src" \
                        sonarsource/sonar-scanner-cli
                    '''
                }
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    mkdir -p odc-reports
                    mkdir -p $HOME/OWASP-Dependency-Check/data

                    docker run --rm \
                        -v "$(pwd):/src:z" \
                        -v "$HOME/OWASP-Dependency-Check/data":/usr/share/dependency-check/data:z \
                        -v "$(pwd)/odc-reports":/report:z \
                        owasp/dependency-check:latest \
                        --scan /src \
                        --format "HTML" \
                        --project "DevOps Monitor" \
                        --out /report \
                        --disableAssembly \
                        --disableNodeAudit \
                        --nvdApiKey "e6fca2d1-0c7e-4b53-8f7f-6cff9e0e85e9"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo '========== Pipeline Summary =========='
            echo "Build Result: ${currentBuild.result ?: 'SUCCESS'}"
        }
        success {
            echo 'All stages passed successfully!'
        }
        unstable {
            echo 'Pipeline completed but some stages had issues. Check logs above.'
        }
        failure {
            echo 'Pipeline failed. Check the logs above for details.'
        }
    }
}
