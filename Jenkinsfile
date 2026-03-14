pipeline {
    agent {
        docker {
            image 'node:18-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        NODE_ENV  = 'test'
        MONGO_URI = credentials('devpulse-mongo-uri')     // Set in Jenkins credentials store
        JWT_SECRET = credentials('devpulse-jwt-secret')
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    stages {

        stage('Install') {
            steps {
                dir('server') {
                    sh 'npm ci'
                }
            }
        }

        // Run lint, test, and security audit in parallel — saves ~40% pipeline time
        stage('Quality gates') {
            parallel {

                stage('Lint') {
                    steps {
                        dir('server') {
                            sh 'npm run lint'
                        }
                    }
                }

                stage('Test') {
                    steps {
                        dir('server') {
                            sh 'npm test -- --ci --reporters=default --reporters=jest-junit'
                        }
                    }
                    post {
                        always {
                            junit 'server/junit.xml'
                            publishHTML([
                                allowMissing: false,
                                reportDir: 'server/coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }

                stage('Security audit') {
                    steps {
                        dir('server') {
                            sh 'npm audit --audit-level=high'
                        }
                    }
                }

            }
        }

        stage('Docker build') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    def image = docker.build("devpulse-server:${env.BUILD_NUMBER}", './server')
                    // Tag as latest on main only
                    if (env.BRANCH_NAME == 'main') {
                        image.tag('latest')
                    }
                }
            }
        }

        stage('Deploy staging') {
            when { branch 'develop' }
            steps {
                sh './scripts/deploy.sh staging'
            }
        }

        stage('Deploy production') {
            when { branch 'main' }
            // Manual approval before production deploy
            input {
                message 'Deploy to production?'
                ok 'Yes, deploy'
            }
            steps {
                sh './scripts/deploy.sh production'
            }
        }

    }

    post {
        success {
            echo "Pipeline passed — build #${env.BUILD_NUMBER} on ${env.BRANCH_NAME}"
        }
        failure {
            echo "Pipeline FAILED — check logs for build #${env.BUILD_NUMBER}"
            // Uncomment to send Slack alert:
            // slackSend channel: '#devpulse-alerts', color: 'danger',
            //   message: "DevPulse build #${env.BUILD_NUMBER} FAILED on ${env.BRANCH_NAME}"
        }
        always {
            cleanWs()
        }
    }
}
