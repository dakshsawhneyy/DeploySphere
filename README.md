# DeploySphere: Engineering Deployment at Scale

Why rely on PaaS platforms that obscure the process when you can **engineer the platform itself**? This project wasn't about simply deploying an app; it was about building the underlying engine that orchestrates deployments with precision and resilience.

**Introducing DeploySphere:** A self-hosted deployment platform engineered from the ground up, designed not just to host applications, but to own the entire pipeline – from isolated builds and artifact storage to real-time logging and dynamic routing.

---
## The Problem Solved
Existing PaaS solutions often present a trade-off: simplicity at the cost of control, flexibility, and deep system understanding. DeploySphere tackles this by providing a transparent, powerful, and scalable deployment architecture built on robust system design principles.

---
## Core Architecture & Features

<img width="1305" height="1024" alt="diagram-export-8-21-2025-3_47_46-PM" src="https://github.com/user-attachments/assets/87a976e1-7159-43e3-9eb4-ac9d2fae98b3" />

DeploySphere is built on an event-driven, fault-tolerant architecture designed for scalability and reliability.

* **Project & Deployment Management:** Leverages **Postgres + Prisma** for robust management of project metadata, deployment history, and user configurations.
* **Isolated Build Environments:** Utilizes **AWS ECS + Docker** to provide containerized build environments, ensuring consistency, reproducibility, and security for every deployment.
* **Artifact & Asset Storage:** Integrates with **AWS ECR** for secure Docker image storage and **AWS S3** for efficient hosting of static build assets.
<img width="1865" height="988" alt="image" src="https://github.com/user-attachments/assets/9c3d4752-4774-43df-ac72-c3bba3701c10" />
* **Real-time Log Streaming:** Implements a **Redis Pub/Sub + Socket.IO** system to stream build and deployment logs directly to the user interface in real-time.
* **Scalable Log Aggregation:** Employs **Kafka + ClickHouse** for a high-throughput, event-driven pipeline capable of aggregating and analyzing logs from numerous concurrent deployments.
<img width="1773" height="885" alt="image" src="https://github.com/user-attachments/assets/403d1a59-d4c0-4e6f-a6e0-03f3af1e4b5e" />
* **Dynamic Routing & Subdomains:** Features a **Custom Reverse Proxy** (built with NodeJS/Express) that dynamically routes traffic to live user deployments and assigns unique subdomains.
<img width="1657" height="1204" alt="image" src="https://github.com/user-attachments/assets/84eaec51-8c44-45d4-a80f-3141969dc00b" />
* **Event-Driven & Asynchronous Processing:** The entire build and deployment process is designed around asynchronous workflows and event-driven principles, allowing for high concurrency and fault tolerance.

---
## Technology Stack

* **Backend:** NodeJS, Express, Prisma
* **Database:** PostgreSQL
* **Containerization:** Docker, AWS ECS, AWS ECR
* **Storage:** AWS S3
* **Real-time:** Redis Pub/Sub, Socket.IO
* **Event Streaming & Analytics:** Kafka, ClickHouse
* **Infrastructure:** AWS (ECS, ECR, S3, etc.)

---
## System Design Philosophy
DeploySphere embodies key system design principles:

* **Event-Driven Architecture:** Decoupled services communicate via events (Kafka), enhancing scalability and resilience.
* **Asynchronous Processing:** Long-running tasks like builds and deployments are handled asynchronously, preventing blocking and improving user experience.
* **Fault Tolerance:** Designed with redundancy and failure isolation in mind.
* **Scalability:** Components like Kafka, ClickHouse, and ECS are chosen for their ability to handle high load.

This platform isn't just a deployment tool; it's an engineered system built by a developer who refuses to rent what can be built.

*(Optional: Add a "Getting Started" or "Usage" section here if applicable, detailing how to set up and run the platform)*
