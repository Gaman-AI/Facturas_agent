# Technology Stack

```markdown
# Technology Stack Documentation

## Technology Stack Overview

The technology stack for the full-stack web application is designed to support a sophisticated browser automation agent system. The stack is modular, separating frontend and backend concerns, and integrates with the `browser-use` Python library to handle browser automation. The frontend is built with React/TypeScript, offering a user-friendly interface for task submission and agent monitoring, while the backend utilizes FastAPI and Python to manage user authentication, API services, and agent orchestration. Real-time updates are delivered via WebSockets, and tasks and user data are stored in **Supabase**, a powerful backend-as-a-service platform that offers scalable storage and authentication.

## Frontend Technologies

The frontend is responsible for providing an intuitive user interface for interacting with the system. It allows users to input natural language commands, monitor agent activity, and intervene in ongoing tasks.

### Key Frontend Technologies:
- **React/Next.js**: Used for building the user interface, offering a reactive and component-based approach for creating the application's views.
- **TailwindCSS**: Utilized for styling the UI, providing utility-first CSS for fast and flexible design.
- **TanStack Query**: Manages state and data fetching for the frontend.
- **WebSocket Client**: Enables real-time communication between the frontend and backend.
- **Axios**: Used for making HTTP requests to the backend API.

### Authentication Mechanism:
- **Next.js Authentication**: Implements simple authentication using Next.js's API routes and a session management mechanism (e.g., `next-auth`) or custom JWT-based authentication.

```mermaid
classDiagram
    class Frontend {
        +React/Next.js: UI Framework
        +TailwindCSS: Styling
        +TanStack Query: State Management
        +WebSocket Client: Real-time Updates
        +Axios: HTTP Requests
    }

```

## Backend Technologies

The backend is built with Python and FastAPI to handle core business logic, API interactions, and automation management. It integrates with the `browser-use` library for browser automation and uses **Supabase** for storing user and task information.

### Key Backend Technologies:

- **Python 3.11**: Primary programming language for backend development.
- **FastAPI**: Web framework used to build RESTful APIs for task management, user authentication, and control.
- **Uvicorn**: ASGI server to run FastAPI in an asynchronous environment.
- **WebSocket Manager**: Manages WebSocket connections to stream real-time updates to the frontend.
- **Pydantic**: Handles data validation and serialization, ensuring robust input handling.

### Authentication & Security:

- **JWT (JSON Web Tokens)**: Used for securing API endpoints. Tokens are generated upon login and required for protected routes.
- **Supabase Authentication**: Leveraging Supabase for user management, including authentication (login/signup) and session handling.

```mermaid
classDiagram
    class Backend {
        +Python 3.11: Programming Language
        +FastAPI: Web Framework
        +Uvicorn: ASGI Server
        +WebSocket Manager: Real-time Communication
        +Pydantic: Data Validation
    }

```

## Agent Module

The agent module integrates the existing `browser-use` Python library to handle browser automation tasks. It is responsible for executing tasks assigned by the user, providing real-time updates, and allowing for user intervention when needed.

### Key Technologies:

- **browser-use Library**: The core automation engine for managing browser-based tasks.
- **Playwright**: Used as an alternative engine for browser control if needed.
- **LLM Integration (OpenAI, Anthropic)**: Leverages large language models for natural language processing and task interpretation.

```mermaid
classDiagram
    class Agent_Module {
        +browser-use Library: Automation Engine
        +Playwright: Browser Engine
        +LLM Integration: NLP Tasks
    }

```

## Database Technologies

The application uses **Supabase** for storage. Supabase provides scalable, PostgreSQL-based storage and simplifies data access with its integrated services for authentication, database management, and real-time updates.

### Key Technologies:

- **Supabase (PostgreSQL)**: A managed database solution for storing user, task, and task-related data.
- **SQLAlchemy ORM**: Provides an abstraction layer for database interaction, simplifying query and data manipulation tasks.

```mermaid
classDiagram
    class Database {
        +Supabase (PostgreSQL): Database Management
        +SQLAlchemy ORM: Data Abstraction
    }

```

## System Architecture

The backend is structured in a modular, service-oriented architecture with clear separation of concerns. This approach enhances scalability, maintainability, and ease of debugging.

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

## Data Flow

The system operates in an event-driven fashion. When a user submits a task, the backend orchestrates the task's execution by interacting with the `browser-use` agent, while providing real-time updates to the frontend through WebSockets.

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

## Deployment Infrastructure

The system will be deployed using a cloud infrastructure to ensure scalability and availability. This includes using a server for running the FastAPI application, a separate container for the agent, and **Supabase** as the managed backend service for persistent storage.

```mermaid
gantt
    title Proposed Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Foundation & Backend
    Backend Setup & API Scaffolding :done, 2024-07-01, 2024-07-10
    Core Agent Integration :active, 2024-07-11, 2024-07-25
    Database & Task Model       :2024-07-26, 2024-08-05

    section Phase 2: Frontend & UI
    Frontend Project Setup       : 2024-07-20, 2024-07-30
    Task Submission & List UI : 2024-08-01, 2024-08-15

    section Phase 3: Real-time Features
    WebSocket Integration (Backend & Frontend) : 2024-08-16, 2024-08-30
    Implement Agent Activity Log : 2024-09-01, 2024-09-15
    Implement Live Preview : 2024-09-16, 2024-09-30

    section Phase 4: Interactivity & Fine-tuning
    Implement Pause/Resume Controls : 2024-10-01, 2024-10-10
    Implement "Take Control" Feature : 2024-10-11, 2024-10-25
    Agent Domain-Specific Finetuning : 2024-10-26, 2024-11-15

    section Phase 5: Testing & Deployment
    Integration Testing & Bug Fixing : 2024-11-16, 2024-11-30
    User Acceptance Testing (UAT)  : 2024-12-01, 2024-12-10
    Deployment to Production : 2024-12-11, 2024-12-15

```