# File Manager Uploader

Node.js + vanilla JavaScript (ES modules) app for managing files and uploading files inside directories.

## Features

- Browse folders
- Navigate into subdirectories and back up
- Create new directories
- Upload one or many files to the current directory
- Delete files or directories
- Path traversal protection to keep actions inside `storage/`

## Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm start
   ```
3. Open:
   - `http://localhost:3000`

## Project Structure

- `server.js` - API and static server
- `public/index.html` - UI markup
- `public/app.js` - frontend ES module logic
- `public/styles.css` - basic styling
- `storage/` - managed file root
