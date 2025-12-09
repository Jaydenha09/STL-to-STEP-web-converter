# STL to STEP Converter

A modular Node.js web application for converting STL files to STEP format with automatic file cleanup and Redis-based job tracking.

## Features

- ✅ Upload STL files via drag-and-drop or file picker
- ✅ Convert STL to STEP format
- ✅ Track conversion jobs with unique IDs
- ✅ Redis-based job management with TTL
- ✅ Automatic file cleanup scheduler
- ✅ Download converted STEP files
- ✅ Expiration tracking and display
- ✅ Modular architecture

## Project Structure

```
stl-to-step-converter/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration
│   ├── services/
│   │   ├── redis.service.js      # Redis operations
│   │   ├── converter.service.js  # STL to STEP conversion
│   │   ├── file.service.js       # File management
│   │   └── cleanup.service.js    # Scheduled cleanup
│   ├── routes/
│   │   └── conversion.routes.js  # API endpoints
│   └── server.js                 # Main application
├── public/
│   ├── index.html                # Frontend UI
│   └── app.js                    # Frontend logic
├── uploads/                      # Uploaded STL files
├── converted/                    # Converted STEP files
└── package.json
```

## Prerequisites

- Node.js 14+ 
- Redis server
- FreeCAD (with freecadcmd CLI tool)

## Installation

1. Install FreeCAD:
   - **Ubuntu/Debian**: `sudo apt-get install freecad`
   - **macOS**: `brew install freecad`
   - **Windows**: Download from [FreeCAD website](https://www.freecadweb.org/)

2. Install Node.js dependencies:
```bash
npm install
```

3. Start Redis (if not running):
```bash
redis-server
```

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

4. Open browser to `http://localhost:3000`

## Configuration

Edit `src/config/index.js` to customize:

- **Port**: Server port (default: 3000)
- **Redis**: Connection settings
- **Upload**: Max file size and directory
- **Jobs**: TTL (time-to-live) and cleanup schedule
- **Cleanup Cron**: Default runs every 15 minutes

## API Endpoints

### POST `/api/convert`
Upload and convert STL file
- Body: `multipart/form-data` with `stlFile` field
- Returns: `{ success, jobId, message }`

### GET `/api/job/:jobId`
Get job status and expiration info
- Returns: Job details including `expiresIn` (seconds)

### GET `/api/download/:jobId`
Download converted STEP file
- Returns: File download

## Environment Variables

```bash
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

## How It Works

1. **Upload**: User uploads STL file via web interface
2. **Job Creation**: System creates job in Redis with TTL
3. **Conversion**: STL file is converted to STEP format
4. **Storage**: Both files stored temporarily
5. **Download**: User downloads converted file
6. **Cleanup**: Scheduled job removes expired files and Redis entries

## Cleanup Process

- Runs every 15 minutes (configurable)
- Removes Redis jobs past TTL
- Deletes associated files
- Cleans up orphaned files

## Conversion Process

The application uses FreeCAD's command-line interface (`freecadcmd`) to convert STL files to STEP format:

1. **Mesh Import**: STL file is imported using FreeCAD's Mesh module
2. **Shape Creation**: Mesh topology is converted to a Part shape with 0.01 tolerance
3. **Document Creation**: Temporary FreeCAD document is created for the conversion
4. **Export**: Shape is exported to STEP format using FreeCAD's Import module
5. **Cleanup**: Temporary document is closed to free memory

The conversion command:
```bash
freecadcmd -c "import Part; import Mesh; import FreeCAD; import Import; mesh = Mesh.read('input.stl'); shape = Part.Shape(); shape.makeShapeFromMesh(mesh.Topology, 0.01); doc = FreeCAD.newDocument('STLImport'); obj = doc.addObject('Part::Feature', 'MeshShape'); obj.Shape = shape; Import.export([obj], 'output.step'); FreeCAD.closeDocument('STLImport')"
```

**Note**: FreeCAD must be installed and the `freecadcmd` command must be available in your system PATH.

## Security Considerations

- File type validation (STL only)
- File size limits (50MB default)
- Automatic cleanup prevents disk filling
- Redis TTL prevents memory leaks
- Input sanitization on all endpoints

## License

MIT