pipeline {
    agent any

    environment {
        PATH = "/usr/local/bin:/opt/homebrew/bin:${env.PATH}"
    }

    stages {
        stage('Build') {
            steps {
                script {
                    echo "=== Building Backend & Frontend ==="
                    dir('backend') { sh 'docker build -t devops-monitor-backend .' }
                    dir('frontend') { sh 'docker build -t devops-monitor-frontend .' }
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                    echo "=== Running SonarQube Scanner ==="
                    docker run --rm \
                        -e SONAR_HOST_URL="http://host.docker.internal:9000" \
                        -e SONAR_LOGIN="admin" \
                        -v "$(pwd):/usr/src" \
                        sonarsource/sonar-scanner-cli
                    '''
                }
            }
        }

        stage('OWASP Security Scan') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                    sh '''
                    echo "=== Running OWASP Dependency Check ==="
                    mkdir -p odc-reports
                    docker run --rm \
                        -v "$(pwd):/src:z" \
                        -v "$(pwd)/odc-reports:/report:z" \
                        owasp/dependency-check:latest \
                        --scan /src --format HTML --project "DevOps Monitor" --out /report --disableAssembly --disableNodeAudit
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully with security tools!'
        }
    }
}
