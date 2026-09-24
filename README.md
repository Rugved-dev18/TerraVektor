# Satellite Change Analysis

**SIH 2026 - Problem Statement 26227: Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery**

A comprehensive full-stack application for satellite imagery analysis, featuring semantic retrieval, multi-temporal change detection, and geospatial provenance tracking. Built as a functional MVP for the Smart India Hackathon 2026.

## 🚀 Project Overview

This application provides a complete foundation for satellite imagery analysis with the following capabilities:

- **Satellite Imagery Ingestion**: Process and store satellite scenes with metadata
- **Semantic Retrieval**: Search satellite imagery using natural language queries
- **Image-based Search**: Find similar scenes using visual similarity
- **Multi-Temporal Change Detection**: Identify and classify changes between time-series imagery
- **False-Alarm Suppression**: Analyst review workflow for validating detected changes
- **Similar-Location Discovery**: Find geographic areas with similar characteristics
- **Geospatial Provenance**: Track data lineage and processing history
- **Interactive Mapping**: Visualize scenes and changes on an interactive map

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- MapLibre GL JS for interactive mapping
- Axios for API communication
- Lucide React for icons

**Backend:**
- Python 3.11+
- FastAPI for REST API
- Pydantic for data validation
- SQLAlchemy for database ORM
- SQLite for MVP (designed for PostgreSQL/PostGIS migration)

**Geospatial & AI Libraries:**
- Rasterio for raster data processing
- GeoPandas for geospatial operations
- Shapely for geometric operations
- PyProj for coordinate transformations
- FAISS for vector similarity search (placeholder implementation)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │  Search UI   │  │   Map View   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API Routes │  │   Services   │  │  Database    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Service Interfaces:                                        │
│  - EmbeddingService (Mock → AI Model)                      │
│  - VectorSearchService (Mock → FAISS)                       │
│  - ChangeDetectionService (Mock → AI Model)                 │
│  - ImagePreprocessingService (Mock → Rasterio)              │
│  - ProvenanceService (Mock → Full Implementation)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   SQLite DB  │  │ Vector Store │  │  File System │     │
│  │  (Scenes,    │  │  (Embeddings)│  │  (Imagery)   │     │
│  │   Changes,   │  │              │  │              │     │
│  │   Reviews)   │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
satellite-change-analysis/
│
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── Sidebar.tsx
│   │   │   └── MapView.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SemanticSearch.tsx
│   │   │   ├── ImageSearch.tsx
│   │   │   ├── ChangeAnalysis.tsx
│   │   │   ├── SimilarLocations.tsx
│   │   │   ├── ReviewQueue.tsx
│   │   │   ├── DataManagement.tsx
│   │   │   └── SystemStatus.tsx
│   │   ├── services/           # API service layer
│   │   │   └── api.ts
│   │   ├── types/              # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── App.tsx             # Main application component
│   │   ├── main.tsx            # Application entry point
│   │   └── index.css           # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── backend/                     # FastAPI backend application
│   ├── app/
│   │   ├── api/                # API route handlers
│   │   │   ├── health.py
│   │   │   ├── scenes.py
│   │   │   ├── search.py
│   │   │   ├── change.py
│   │   │   ├── review.py
│   │   │   └── provenance.py
│   │   ├── models/             # Database models
│   │   │   ├── scene.py
│   │   │   ├── tile.py
│   │   │   ├── change_candidate.py
│   │   │   ├── analyst_review.py
│   │   │   └── processing_log.py
│   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── scene.py
│   │   │   ├── change.py
│   │   │   └── search.py
│   │   ├── services/           # Business logic services
│   │   │   ├── embedding_service.py
│   │   │   ├── vector_search_service.py
│   │   │   ├── change_detection_service.py
│   │   │   ├── image_preprocessing_service.py
│   │   │   └── provenance_service.py
│   │   ├── database.py         # Database configuration
│   │   └── main.py             # FastAPI application entry
│   ├── requirements.txt
│   └── Dockerfile
│
├── data/                        # Data storage
│   ├── imagery/                # Satellite imagery files
│   ├── thumbnails/            # Image thumbnails
│   ├── metadata/              # Scene metadata
│   └── sample/                # Sample data files
│
├── models/                      # AI model storage
│
├── vector_store/                # Vector search indices
│
├── scripts/                     # Utility scripts
│   └── generate_mock_data.py   # Mock data generation
│
├── docs/                        # Documentation
│
├── docker-compose.yml          # Docker orchestration
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

## 🛠️ Installation

### Prerequisites

- **Backend**: Python 3.11 or higher
- **Frontend**: Node.js 18 or higher
- **Optional**: Docker and Docker Compose

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. The database will be automatically created on first run.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## 🚀 Running the Application

### Method 1: Local Development

**Start the Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Method 2: Docker Compose

```bash
docker-compose up --build
```

### Method 3: Generate Mock Data

To populate the database with mock satellite scenes and change candidates:

```bash
cd scripts
python generate_mock_data.py
```

This will create:
- 10 mock satellite scenes with Indian geographic locations
- 5 mock change candidates
- Vector embeddings for semantic search
- Processing logs for provenance tracking

## 📡 API Documentation

### Health Check
- **GET** `/api/health` - System health status

### Scenes
- **GET** `/api/scenes` - List all satellite scenes
- **GET** `/api/scenes/{scene_id}` - Get specific scene details
- **POST** `/api/ingest` - Ingest new satellite scene

### Search
- **POST** `/api/search/semantic` - Semantic text search
- **POST** `/api/search/image` - Image-based similarity search

### Change Analysis
- **POST** `/api/change/analyze` - Analyze changes between scenes
- **GET** `/api/change/change/{change_id}` - Get specific change candidate
- **GET** `/api/change/candidates` - List change candidates

### Review
- **POST** `/api/review/{candidate_id}` - Submit analyst review
- **GET** `/api/reviews/{candidate_id}` - Get reviews for candidate

### Provenance
- **GET** `/api/provenance/{scene_id}` - Get scene provenance data
- **GET** `/api/provenance/{scene_id}/history` - Get processing history

### Interactive API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive Swagger UI documentation.

## 🌐 Offline Operation

This application is designed to run completely offline without external dependencies:

### No External APIs Required
- ❌ No OpenAI API
- ❌ No Gemini API
- ❌ No Google Maps API
- ❌ No cloud geocoding APIs
- ❌ No external inference APIs

### Offline Capabilities
- ✅ Local SQLite database
- ✅ Mock AI services (ready for real model integration)
- ✅ OpenStreetMap tiles for mapping (cached when available)
- ✅ Local file storage for imagery
- ✅ Local vector search (mock implementation)

### Map tiles note: The application uses OpenStreetMap tiles which require internet access. For fully offline operation, replace the tile source with local map tiles or use offline mapping solutions.

## 🔮 Future AI Integration

The application is designed with clean service interfaces that can be easily replaced with actual AI implementations:

### Embedding Service
**Current**: Mock implementation with deterministic random embeddings
**Future**: Replace with:
- CLIP model for image-text embeddings
- Satellite-specific pretrained models
- Custom fine-tuned embeddings

### Vector Search Service
**Current**: Mock implementation with cosine similarity
**Future**: Replace with:
- FAISS for efficient similarity search
- ChromaDB or Weaviate for vector database
- Pinecone for cloud vector search

### Change Detection Service
**Current**: Mock implementation with random change generation
**Future**: Replace with:
- Deep learning models for change detection
- U-Net architectures for semantic segmentation
- Temporal analysis models
- False-alarm suppression algorithms

### Image Preprocessing Service
**Current**: Mock implementation
**Future**: Enhance with:
- Rasterio for actual satellite image processing
- Cloud detection and masking
- Atmospheric correction
- Image normalization and enhancement

### Provenance Service
**Current**: Basic mock implementation
**Future**: Enhance with:
- Complete data lineage tracking
- Processing pipeline metadata
- Quality metrics and validation
- Audit trail for regulatory compliance

## 🎯 Acceptance Criteria

### Task 1 Completion ✅

- [x] Backend starts successfully
- [x] Frontend starts successfully  
- [x] Dashboard loads
- [x] Map loads with markers
- [x] Mock satellite scenes appear in dashboard
- [x] Clicking a scene shows metadata
- [x] Search endpoint returns mock ranked results
- [x] Change-analysis endpoint returns mock change candidates
- [x] Review buttons work in the UI
- [x] Data persists in the local database
- [x] README contains complete setup instructions
- [x] No cloud API is required for operation

## 🗺️ Demo Data

The application includes mock data featuring Indian geographic locations:

- **Pune Urban Area** (18.5204°N, 73.8567°E)
- **Mumbai Coastal Region** (19.0760°N, 72.8777°E)
- **Nagpur Industrial Zone** (21.1458°N, 79.0882°E)
- **Nashik Agricultural Region** (19.9975°N, 73.7898°E)
- **Bengaluru Tech Corridor** (12.9716°N, 77.5946°E)
- **Hyderabad Urban Expansion** (17.3850°N, 78.4867°E)
- **Delhi Metropolitan Area** (28.7041°N, 77.1025°E)
- **Chennai Coastal Zone** (13.0827°N, 80.2707°E)
- **Kolkata Urban Region** (22.5726°N, 88.3639°E)
- **Jaipur Heritage Site** (26.9124°N, 75.7873°E)

**⚠️ Important**: All data is mock/demo data for demonstration purposes. This is not real satellite imagery or change detection data.

## 🎨 Features

### Dashboard
- Overview of system status and statistics
- Interactive map with scene locations
- Recent change candidates
- Scene inventory summary

### Semantic Search
- Natural language search for satellite imagery
- Query suggestions and examples
- Ranked results with similarity scores
- Metadata display for each result

### Image Search
- Upload reference images
- Visual similarity search
- Thumbnail gallery of results
- Confidence scoring

### Change Analysis
- Select before/after scene pairs
- Automated change detection
- Change type classification
- Confidence scoring
- Geographic display of changes

### Similar Locations
- Geographic similarity discovery
- Location-based recommendations
- Distance calculations
- Scene comparison tools

### Review Queue
- Analyst workflow for change validation
- Before/after image comparison
- Confirm/reject functionality
- Review history tracking

### Data Management
- Complete scene inventory
- Advanced filtering and search
- Scene metadata display
- Processing status tracking

### System Status
- Health monitoring
- Service status dashboard
- System information
- Development progress tracking

## 🤝 Contributing

This is a hackathon project for SIH 2026. For contributions or questions, please refer to the competition guidelines.

## 📄 License

This project is developed for the Smart India Hackathon 2026. License terms to be determined based on competition requirements.

## 🙏 Acknowledgments

- **SIH 2026** - Smart India Hackathon
- **Problem Statement 26227** - Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery
- Open-source geospatial and AI communities

## 📞 Support

For technical support during the hackathon, please refer to:
- SIH 2026 documentation
- Mentor support channels
- Competition Q&A forums

---

**Built with ❤️ for SIH 2026**
