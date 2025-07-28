# Application Flow Documentation

---

## **General Description**

This SaaS application automates the manual process of filling out Mexican CFDI 4.0 invoicing forms across vendor portals using an AI-powered **Browser-Use agent**. The system is designed to improve efficiency and transparency for small businesses and freelancers by eliminating repetitive form submission tasks while providing real-time monitoring and user intervention capabilities.

**Primary Objectives:**

- Automate CFDI 4.0 form completion on vendor portals.
- Provide real-time transparency through live browser streaming.
- Enable user intervention when obstacles arise (CAPTCHA, login issues).
- Improve operational efficiency by reducing manual form filling.
- Ensure secure, scalable multi-tenant architecture.

**Key Benefits:**

- Reduces time spent on repetitive administrative tasks.
- Provides full transparency with live browser streaming.
- Supports any vendor portal through generalized automation.
- Offers secure multi-tenant support with JWT authentication.
- Enables real-time monitoring and control.

---

## **User Registration & Authentication**

The application uses JWT-based authentication through Supabase for secure multi-tenant access. Users can register, authenticate, and manage their credentials securely.

**Authentication Flow:**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant D as Database

    U->>F: Registration Request
    F->>S: Create User Account
    S->>D: Store User Credentials
    S-->>F: Return JWT Token
    F-->>U: Registration Complete

    U->>F: Login Request
    F->>S: Authenticate User
    S-->>F: JWT Token
    F-->>U: Access Granted

```

**User Data Management:**

- User details (RFC, address, contact information) are securely stored in Supabase.
- Session management through JWT tokens.
- Multi-tenant support for business accounts.
- Secure credential storage for vendor portal access.

---

## **Core Application Workflow**

The main application flow follows a streamlined process from task submission to completion with real-time monitoring.

**Complete User Journey:**

```mermaid
graph TD
    A[User Login] --> B[Dashboard Access]
    B --> C[Input Ticket Details & Vendor URL]
    C --> D[Submit for Processing]
    D --> E[Browser-Use Agent Starts]
    E --> F[Live Browser Stream via Browserbase]
    F --> G{User Interaction Needed?}
    G -->|Yes| H[Pause for User Input]
    G -->|No| I[Continue Processing]
    H --> J[User Resolves Issue]
    J --> K[Resume Processing]
    I --> L{Processing Complete?}
    K --> L
    L -->|Success| M[Form Submitted Successfully]
    L -->|Error| N[Retry or Manual Intervention]
    M --> O[Update Task Status]
    N --> O
    O --> P[User Notification]
    P --> Q[View Task History]

```

---

## **System Architecture**

The application follows a modern microservices architecture with clear separation of concerns between frontend, backend, and automation services.

**High-Level Architecture:**

```mermaid
classDiagram
    class Frontend {
        +React 19
        +shadcn/ui Components
        +Tailwind CSS
        +Real-time WebSocket
        +Dual-Pane Interface
        +browserbase_integration()
        +task_monitoring()
        +user_controls()
    }

    class Backend {
        +Node.js Express
        +JWT Authentication
        +WebSocket Server
        +Task Queue Management
        +api_endpoints()
        +session_management()
        +error_handling()
    }

    class Database {
        +Supabase PostgreSQL
        +User Management
        +Task Storage
        +Session Data
        +store_user_data()
        +track_tasks()
        +manage_sessions()
    }

    class AutomationEngine {
        +Browser-Use Agent
        +Browserbase Integration
        +Form Detection
        +Error Recovery
        +navigate_portals()
        +fill_forms()
        +handle_errors()
    }

    class QueueSystem {
        +Redis
        +Task Scheduling
        +Session Management
        +queue_tasks()
        +manage_concurrent_sessions()
    }

    Frontend --> Backend : API Calls
    Backend --> Database : Data Operations
    Backend --> QueueSystem : Task Management
    QueueSystem --> AutomationEngine : Process Tasks
    AutomationEngine --> Backend : Status Updates
    Backend --> Frontend : Real-time Updates

```

---

## **Data Processing Flow**

The system processes user data and ticket information through a secure pipeline to automate form submission.

**Data Processing Sequence:**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant R as Redis
    participant A as Browser-Use Agent
    participant S as Supabase
    participant V as Vendor Portal

    F->>B: Submit Ticket Details + Vendor URL
    B->>S: Store Task Data
    S-->>B: Task Created
    B->>R: Queue Task
    R-->>A: Task Available
    A->>S: Retrieve User Data
    S-->>A: User Data
    A->>V: Navigate to Vendor URL
    A->>V: Fill Form with Ticket & User Details
    A->>V: Submit Form
    V-->>A: Response
    A->>B: Update Task Status
    B->>F: Notify User (WebSocket)
    F->>U: Display Status & Result

```

---

## **Error Handling & Recovery**

The system implements comprehensive error handling with automatic retries and user intervention options.

**Error Handling State Machine:**

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Task started
    Processing --> FormFilling: Page loaded
    FormFilling --> FieldError: Invalid input
    FieldError --> Retry: Attempt < 3
    Retry --> FormFilling
    FieldError --> Paused: Attempt = 3
    Processing --> CaptchaDetected: Security check
    CaptchaDetected --> Paused: Auto-bypass failed
    Processing --> LoginRequired: Session expired
    LoginRequired --> CredentialRefresh: Use stored credentials
    CredentialRefresh --> Processing
    Paused --> Processing: User intervention
    Processing --> Completed: Form submitted
    Completed --> [*]
    Failed --> [*]

```

**Error Types & Responses:**

- **CAPTCHA Detection**: Pause automation, request user intervention.
- **Login Issues**: Prompt user for manual authentication.
- **Form Validation Errors**: Automatic retry with adjusted parameters.
- **Network Timeouts**: Retry with exponential backoff.
- **Unknown Errors**: Log details, attempt retry, escalate if persistent.

---

## **Real-Time Interface Components**

The dual-pane interface provides comprehensive real-time monitoring and control capabilities.

**Interface Layout:**

```mermaid
graph TB
    subgraph "Main Interface (100%)"
        subgraph "Live Browser View (70%)"
            LB[Live Browserbase Stream]
            LB --> BA[Browser Actions Visible]
            LB --> FP[Form Progress Display]
        end

        subgraph "Control Sidebar (30%)"
            CS[Current Status]
            CS --> AL[Action Log]
            CS --> CC[Control Center]
            CC --> PB[Pause Button]
            CC --> RB[Resume Button]
            CC --> TB[Take Control Button]
            CC --> CB[Cancel Button]
        end
    end

    subgraph "Status Updates"
        WS[WebSocket Connection]
        WS --> CS
        WS --> AL
    end

```

**Real-Time Features:**

- Live browser streaming via Browserbase integration.
- WebSocket-based status updates in Spanish.
- Interactive session controls (pause/resume/takeover).
- Continuous action logging with timestamps.
- Progress indicators for form completion stages.

---

## **Task Management System**

The application tracks and manages automation tasks with comprehensive status monitoring.

**Task Lifecycle:**

```mermaid
graph LR
    A[Task Created] --> B[Queued]
    B --> C[In Progress]
    C --> D[Paused]
    C --> E[Completed]
    C --> F[Failed]
    D --> C
    F --> G[Retry Available]
    G --> B
    E --> H[Archived]
    F --> H

```

**Task Status Categories:**

- **Queued**: Task waiting for available agent.
- **In Progress**: Active automation in process.
- **Paused**: User intervention required.
- **Completed**: Form successfully submitted.
- **Failed**: Automation unsuccessful after retries.
- **Archived**: Historical record maintained.

---

## **Security & Compliance Framework**

The system implements comprehensive security measures to protect user data and ensure compliance with Mexican data protection laws.

**Security Architecture:**

```mermaid
graph TD
    subgraph "Security Layers"
        A[HTTPS Encryption] --> B[JWT Authentication]
        B --> C[Database Encryption at Rest]
        C --> D[Data Encryption in Transit]
        D --> E[Session Management]
        E --> F[Access Control]
    end

    subgraph "Compliance Measures"
        G[Mexican Data Protection Laws]
        H[Secure Credential Storage]
        I[Audit Logging]
        J[Data Retention Policies]
    end

    A --> G
    F --> I

```

**Security Features:**

- End-to-end HTTPS encryption.
- JWT-based authentication with secure token management.
- Encrypted storage of sensitive user data and credentials.
- Secure session management with timeout controls.
- Comprehensive audit logging for compliance tracking.
- Regular security updates and vulnerability assessments.

---

## **Performance & Scalability Specifications**

**Performance Targets:**

- API response time: <200ms for standard operations.
- Session timeout: 3-minute global timeout per automation task.
- Action timeout: 10-second timeout per browser action.
- Concurrent sessions: Support for 10+ simultaneous automation tasks.

**Scalability Design:**

- Multi-tenant architecture supporting 1,000+ concurrent users.
- Redis-based queue management for efficient task distribution.
- Supabase database scaling for growing data volumes.
- Horizontal scaling capability for increased load.

**Monitoring & Reliability:**

- Continuous system health monitoring.
- Automatic retry logic (up to 3 attempts for transient errors).
- Daily backups with point-in-time recovery.
- 99.9% uptime target with redundancy measures.

---

## **Technical Integration Points**

**External Services:**

- **Browserbase**: Live browser streaming and control interface.
- **Supabase**: Database, authentication, and storage services.
- **Redis**: Task queuing and session management.
- **Browser-Use Agent**: Core automation engine for form filling.

**API Endpoints:**

- `POST /api/auth/login` - User authentication.
- `POST /api/task` - Submit new automation task.
- `GET /api/task/{id}/status` - Check task progress.
- `PUT /api/task/{id}/control` - Pause/resume/cancel task.
- `GET /api/dashboard` - User dashboard data.
- `WebSocket /ws/status` - Real-time status updates.

---

## **Future Enhancement Roadmap**

**Planned Features (Post-MVP):**

- Advanced task history with filtering and sorting.
- Invoice content verification through scraping.
- Multi-language support beyond Spanish.
- Integration with popular accounting software.
- Enterprise-level multi-tenant features.
- Advanced analytics and reporting capabilities.
- Mobile application for task monitoring.

**Technical Improvements:**

- Enhanced AI agent capabilities.
- Improved error prediction and prevention.
- Advanced security features.
- Performance optimization for larger scale operations.

---