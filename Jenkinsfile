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
                    sh 'chmod +x ./run-owasp.sh && ./run-owasp.sh'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        unstable {
            echo 'Pipeline completed with some warnings. Check stage results.'
        }
        failure {
            echo 'Pipeline failed. Check the logs above.'
        }
    }
}
