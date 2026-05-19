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
                dir('backend') {
                    sh 'docker build -t devopslabexam-backend .'
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'docker build -t devopslabexam-frontend .'
                }
            }
        }
        
        stage('SonarQube Analysis') {
            environment {
                // You need to configure this credential in Jenkins
                SONAR_TOKEN = credentials('sonarqube-token')
            }
            steps {
                // Assuming sonar-scanner is installed in Jenkins or using a dockerized scanner
                sh '''
                docker run --rm \
                    -e SONAR_HOST_URL="http://localhost:9000" \
                    -e SONAR_LOGIN="${SONAR_TOKEN}" \
                    -v "$(pwd):/usr/src" \
                    --network host \
                    sonarsource/sonar-scanner-cli
                '''
            }
        }
        
        stage('OWASP Dependency Check') {
            steps {
                sh './run-owasp.sh'
            }
        }
    }
}
