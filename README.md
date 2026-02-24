# PKI-Dashboard-A-Web-Based-Certificate-Lifecycle-Management-System

The PKI-Dashboard is a web-based application designed to simplify and centralize the management of digital certificates within an organization. It serves as a complete Certificate Lifecycle Management System, handling certificate issuance, monitoring, renewal, and revocation through an intuitive dashboard interface.

Public Key Infrastructure (PKI) is essential for secure communication in digital systems. However, manual certificate management can lead to inefficiencies, errors, and service disruptions. This project aims to automate and streamline these processes by providing administrators with a centralized and user-friendly solution.

Problem Statement

In many organizations, digital certificate management is performed manually and across multiple systems. This approach is inefficient, error-prone, and lacks centralized visibility. Administrators often miss certificate expiration dates, leading to downtime and potential security risks. There is a need for a single platform that can automate certificate lifecycle management, issue and revoke certificates, and provide proactive alerts for upcoming expirations.

Objectives

Mini Certificate Authority (CA):
Develop a backend that can issue and sign new certificates, extending beyond self-signed ones.

Multi-Page Dashboard:
Design separate views for an overview, certificate list, and detailed inspection.

Lifecycle Management:
Implement features for revoking certificates and maintaining a Certificate Revocation List (CRL).

Automation:
Integrate automated email notifications for certificates nearing expiration.

Technology Stack

Frontend: React.js, Bootstrap

Backend: Firebase

Security Tools: OpenSSL, PKI Libraries
