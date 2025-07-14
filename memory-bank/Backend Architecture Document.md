# Backend Architecture Document

---

## **Introduction**

The backend system serves as the central nervous system for the browser automation application. Its primary objective is to manage the entire lifecycle of an automation task—from receiving a natural language command to orchestrating the `browser-use` agent and streaming real-time progress back to the user. It is responsible for API services, user authentication, WebSocket communication, agent management, and database operations, providing a robust and scalable foundation for the entire platform.

---

## **Modular Design**

The backend will adopt a modular, service-oriented architecture inspired by the Netflix Dispatch model, as referenced in the `browser-use` documentation. This promotes a clean separation of concerns and enhances maintainability. The core logic will be organized into distinct services, each with a specific responsibility.

### Proposed File Structure

```
src/
├── main.py             # FastAPI app entry point
├── core/
│   ├── config.py       # Configuration management
│   └── security.py     # Security helpers (password hashing, JWT)
├── db/
│   ├── database.py     # Database session management
│   └── models.py       # SQLAlchemy ORM models (User, Task)
├── api/
│   ├── deps.py         # FastAPI dependencies
│   └── endpoints/
│       ├── auth.py     # Authentication routes
│       └── tasks.py    # Task management routes
├── services/
│   ├── user_service.py # User-related business logic
│   └── task_service.py # Task creation and management logic
├── agent/
│   ├── agent_manager.py # Handles the lifecycle of browser-use agents
│   └── socket_manager.py # Manages WebSocket connections and broadcasts
└── schemas/
    ├── task.py         # Pydantic schemas for tasks
    ├── user.py         # Pydantic schemas for users
    └── token.py        # Pydantic schemas for JWT tokens

```

### Class Diagram

```mermaid
classDiagram
    direction LR
    class FastAPI_App {
        <<Router>>
        + /api/v1/auth
        + /api/v1/tasks
        + /ws/task_id
    }
    class TaskService {
        +create_task()
        +get_task()
        +pause_task()
        +resume_task()
    }
    class AgentManager {
        +run_agent_session()
        -execute_agent_loop()
    }
    class SocketManager {
        +connect()
        +disconnect()
        +broadcast_update()
    }
    class Database {
        +User
        +Task
        +TaskStep
    }

    FastAPI_App --> TaskService : "Invokes"
    TaskService --> AgentManager : "Initiates"
    AgentManager --> SocketManager : "Streams updates via"
    TaskService --> Database : "CRUD"
    SocketManager --> FastAPI_App : "Broadcasts to"
```

---

## **Data Flow and Agent Orchestration**

The entire system is event-driven, centered around the lifecycle of a task. The following sequence diagram illustrates the data flow when a user submits a new task.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend_API
    participant AgentManager
    participant BrowserUse_Agent
    participant WebSocket

    User->>+Frontend: Submits task ("Order a pizza")
    Frontend->>+Backend_API: POST /api/v1/tasks (task_prompt)
    Backend_API->>Backend_API: Create Task record in DB (status: PENDING)
    Backend_API-->>-Frontend: { "task_id": "xyz-123" }
    Frontend->>+WebSocket: Connects to ws://localhost:8001/ws/xyz-123
    WebSocket-->>-Frontend: Connection successful

    Backend_API->>+AgentManager: start_agent_session(task_id="xyz-123")
    Note over AgentManager: Spawns a new background process/thread

    AgentManager->>+BrowserUse_Agent: Initialize(prompt="Order a pizza")

    loop Agent Execution
        BrowserUse_Agent->>BrowserUse_Agent: 1. Reason about goal (thinking)
        BrowserUse_Agent->>BrowserUse_Agent: 2. Decide next action (action)
        BrowserUse_Agent->>BrowserUse_Agent: 3. Execute browser action (e.g., page.goto())

        BrowserUse_Agent->>AgentManager: Sends structured state update (JSON)
        AgentManager->>WebSocket: broadcast_update(task_id, update_json)
        WebSocket->>Frontend: Pushes real-time update
        Frontend->>Frontend: Renders new step in Activity Log & updates Live Preview
    end

    BrowserUse_Agent-->>-AgentManager: Task finished
    AgentManager->>Backend_API: Update Task in DB (status: COMPLETED)
    AgentManager->>WebSocket: Broadcast final status
    AgentManager-->>-Backend_API: Session complete
```

---

## **User Intervention Flow**

A key feature is allowing the user to pause the agent and take manual control. This requires careful state management.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend_API
    participant AgentManager

    User->>+Frontend: Clicks "Pause"
    Frontend->>+Backend_API: POST /api/v1/tasks/{task_id}/pause
    Backend_API->>+AgentManager: signal_pause(task_id)
    Note over AgentManager: Sets an event flag that the agent loop checks
    AgentManager-->>-Backend_API: Acknowledged
    Backend_API-->>-Frontend: { "status": "PAUSED" }

    User->>+Frontend: Clicks "Take Control"
    Note over Frontend: Live Preview becomes interactive or a secure remote debug URL is provided.
    User->>User: Performs manual browser actions

    User->>+Frontend: Clicks "Resume"
    Frontend->>+Backend_API: POST /api/v1/tasks/{task_id}/resume
    Backend_API->>+AgentManager: signal_resume(task_id)
    Note over AgentManager: Clears the pause event flag
    AgentManager-->>-Backend_API: Acknowledged
    Backend_API-->>-Frontend: { "status": "RUNNING" }

```

---

## **Database Schema**

A relational database will be used to persist users, tasks, and task steps. SQLAlchemy will be our ORM.

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string hashed_password
        datetime created_at
    }

    TASKS {
        int id PK
        int user_id FK
        string prompt
        string status
        datetime created_at
        datetime completed_at
    }

    TASK_STEPS {
        int id PK
        int task_id FK
        string type "e.g., thinking, action"
        json content "The agent's structured output"
        datetime timestamp
    }

    USERS ||--o{ TASKS : has
    TASKS ||--o{ TASK_STEPS : has

```

---

## **API Endpoints**

The backend will expose a RESTful API for all operations.

- **Authentication**
    - `POST /api/v1/auth/register`: Create a new user.
    - `POST /api/v1/auth/login`: Authenticate and receive a JWT token.
- **Task Management**
    - `POST /api/v1/tasks`: Create a new automation task.
    - `GET /api/v1/tasks`: Get a list of all tasks for the authenticated user.
    - `GET /api/v1/tasks/{task_id}`: Get details for a single task.
- **Task Control**
    - `POST /api/v1/tasks/{task_id}/pause`: Pause a running task.
    - `POST /api/v1/tasks/{task_id}/resume`: Resume a paused task.
- **WebSocket**
    - `WS /ws/{task_id}`: Establish a WebSocket connection for real-time updates.

---

## **Security Measures**

Security is a primary consideration, handled at multiple layers.

```mermaid
stateDiagram-v2
    direction LR
    state "No Access" as Unauthenticated
    state "Has Access Token" as Authenticated

    [*] --> Unauthenticated
    Unauthenticated --> Authenticated: POST /login (valid credentials)
    Authenticated --> Unauthenticated: Token Expired / Logout

    state Authenticated {
        direction LR
        state "Can Access Public Routes" as Public
        state "Can Access Protected Routes" as Protected
        [*] --> Public
        Public --> Protected: Request with valid JWT
        Protected --> Public: No token in header
    }

```

- **Authentication**: JWT (JSON Web Tokens) will be used for securing API endpoints. Users receive a token upon login, which must be included in the `Authorization` header for protected routes.
- **Authorization**: Standard password-based authentication with password hashing (e.g., using `passlib`).
- **CORS**: Cross-Origin Resource Sharing (CORS) will be configured in FastAPI to only allow requests from the designated frontend domain.
- **Environment Variables**: All sensitive information, including database connection strings, secret keys, and API keys for LLM providers, will be managed through environment variables and a `.env` file, never hardcoded.
- **Input Validation**: FastAPI's use of Pydantic models automatically validates incoming request data, preventing many common injection-style vulnerabilities.

---