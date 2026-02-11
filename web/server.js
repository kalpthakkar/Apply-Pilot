
// server.js
import express from "express";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import fileUtils from "./fileUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

const UPLOADS_DB = path.join(__dirname, "uploads");
const DATA_FILE = path.join(__dirname, "userData.json");

// -----------------------------
// Ensure all database directories exists
// -----------------------------
await fileUtils.ensureDir(UPLOADS_DB);
await fileUtils.ensureDir(path.join(UPLOADS_DB, "resumes"));
await fileUtils.ensureDir(path.join(UPLOADS_DB, "projects"));
await fileUtils.ensureDir(path.join(UPLOADS_DB, "achievements"));

// -----------------------------
// Middleware
// -----------------------------
app.use(cors());
app.use(express.json());
// Serve uploaded files publicly
app.use("/uploads", express.static(UPLOADS_DB));

// -----------------------------
// Multer Setup for file uploads
// -----------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {

    let baseFolder;

    // 🔹 Decide category based on field name
    if (file.fieldname.startsWith("resumeContainerID")) {
        baseFolder = path.join(UPLOADS_DB, "resumes");
    }
    else if (file.fieldname.startsWith("projectContainerID")) {
        baseFolder = path.join(UPLOADS_DB, "projects");
    }
    else if (file.fieldname.startsWith("achievementContainerID")) {
        baseFolder = path.join(UPLOADS_DB, "achievements");
    }

    // Generate a unique folder for this upload: timestamp + random number
    const uniqueFolder = path.join(baseFolder, `${Date.now()}${Math.floor(Math.random() * 10000)}`);
    
    // Ensure the folder exists
    fs.mkdirSync(uniqueFolder, { recursive: true });
    
    // Set this folder as the destination
    cb(null, uniqueFolder);
  },
  filename: (req, file, cb) => {
    // Keep the original filename, including spaces
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// -----------------------------
// Data Storage Helpers
// -----------------------------
// Load user data from JSON file
function loadUserData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(data || "{}");
    } catch (err) {
        console.error("❌ Error reading user data:", err);
        return {};
    }
}

// Save user data to JSON file
function saveUserData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// -----------------------------
// Helper: Delete a file if it exists
// -----------------------------
async function deleteFileIfExists(filePath) {
    try {
        await fsPromises.access(filePath);
        await fsPromises.unlink(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.warn(`⚠️ Could not delete file ${filePath}: ${err.message}`);
        }
    }
}

// -----------------------------
// Helper: Clean orphan files (not referenced in userData)
// -----------------------------
async function cleanOrphanFiles() {
    const userData = loadUserData();
    const usedFiles = new Set(
        (userData.resumes || [])
            .filter(r => r.resumeFile)
            .map(r => path.join(__dirname, r.resumeFile))
    );

    const resumesDir = path.join(UPLOADS_DB, "resumes");
    const filesInFolder = await fsPromises.readdir(resumesDir);

    const deletionPromises = filesInFolder.map(file => {
        const absolutePath = path.join(UPLOADS_DB, file);
        if (!usedFiles.has(absolutePath)) {
            return deleteFileIfExists(absolutePath);
        }
    });

    await Promise.all(deletionPromises);
}

// -----------------------------
// API ROUTES
// -----------------------------

// -----------------------------
// POST /api/user-with-files
// -----------------------------

app.post("/api/user-with-files", upload.any(), async (req, res) => {
    console.log("📥 Received /api/user-with-files");
    console.log("Files:", req.files?.length, "Body keys:", Object.keys(req.body));

    try {
        const formData = JSON.parse(req.body.data || "{}");
        const discardedCounter = req.body.discardedCounter ? JSON.parse(req.body.discardedCounter) : { projects: 0, achievements: 0 }; // Parse the discardedCounter (it was sent as a JSON string)
        const userDB = loadUserData(); // Load existing userData.json

        const deletionPromises = new Set();
        const uploadedFiles = {
            resumes: {},
            projects: {},
            achievements: {}
        };

        // ✅ Normalize resumes safely
        if (!Array.isArray(formData.resumes)) {
            formData.resumes = [{}];
        }
        if (formData.resumes.length === 0) {
            formData.resumes.push({});
        }
        if (typeof formData.resumes[0] !== "object" || formData.resumes[0] === null) {
            formData.resumes[0] = {};
        }
        // Pre-cleaning `formData.resumes`
        // formData.resumes = formData.resumes && formData.resumes.length ? formData.resumes : [{}];

        // ----------------------------------------------------
        // ----- Handle Resumes / Projects / Achievements -----
        // ----------------------------------------------------
        req.files.forEach((file) => {
            // Resumes
            let match = file.fieldname.match(/^resumeContainerID_(\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                const storedPath = path.relative(UPLOADS_DB, file.path).replace(/\\/g, "/");

                uploadedFiles.resumes[idx] = { resumeStoredPath: storedPath };

                if (formData.resumes[0][file.fieldname]?.resumeStoredPath) {
                    deletionPromises.add(formData.resumes[0][file.fieldname].resumeStoredPath);
                    uploadedFiles.resumes[idx].method = "replace";
                } else {
                    uploadedFiles.resumes[idx].method = "add";
                }

                formData.resumes[0][file.fieldname] = {
                    ...(formData.resumes[0][file.fieldname] || {}),
                    id: path.basename(file.destination),
                    originalname: file.originalname,
                    encoding: file.encoding,
                    mimetype: file.mimetype,
                    destination: file.destination,
                    filename: file.filename,
                    path: file.path,
                    size: file.size,
                    resumeStoredPath: storedPath
                };
                return;
            }

            // Projects
            match = file.fieldname.match(/^projectContainerID_(\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                const storedPath = path.relative(UPLOADS_DB, file.path).replace(/\\/g, "/");

                uploadedFiles.projects[idx] = { fileStoredPath: storedPath };
                const titles = Object.keys(formData.projects || {});
                const title = titles[idx-discardedCounter.projects]; // match by order in formData

                if (title) {
                    // Add old file to deletion
                    if (formData.projects[title]?.file) deletionPromises.add(formData.projects[title].file);

                    formData.projects[title] = {
                        ...formData.projects[title],
                        file: storedPath
                    };
                }
                return;
            }

            // Achievements
            match = file.fieldname.match(/^achievementContainerID_(\d+)$/);
            if (match) {
                const idx = parseInt(match[1], 10);
                const storedPath = path.relative(UPLOADS_DB, file.path).replace(/\\/g, "/");

                uploadedFiles.achievements[idx] = { fileStoredPath: storedPath };
                const titles = Object.keys(formData.achievements || {});
                const title = titles[idx-discardedCounter.achievements]; // match by order in formData

                if (title) {
                    if (formData.achievements[title]?.file) deletionPromises.add(formData.achievements[title].file);

                    formData.achievements[title] = {
                        ...formData.achievements[title],
                        file: storedPath
                    };
                }
                return;
            }
        });

        // --------------------------
        // ----- Flatten Resumes -----
        // --------------------------
        formData.resumes = formData.resumes.flatMap(rg => Object.values(rg || {}));

        // --------------------------
        // ----- Delete Removed Files Safely -----
        // --------------------------
        // Resumes
        const dbResumePaths = new Set((userDB.resumes || []).map(r => r.resumeStoredPath));
        const formResumePaths = new Set((formData.resumes || []).map(r => r.resumeStoredPath));
        [...dbResumePaths].filter(x => !formResumePaths.has(x)).forEach(x => deletionPromises.add(x));

        // Projects
        const dbProjectPaths = new Set(Object.values(userDB.projects || {}).map(p => p.file).filter(Boolean));
        const formProjectPaths = new Set(Object.values(formData.projects || {}).map(p => p.file).filter(Boolean));
        [...dbProjectPaths].filter(x => !formProjectPaths.has(x)).forEach(x => deletionPromises.add(x));

        // Achievements
        const dbAchievementPaths = new Set(Object.values(userDB.achievements || {}).map(a => a.file).filter(Boolean));
        const formAchievementPaths = new Set(Object.values(formData.achievements || {}).map(a => a.file).filter(Boolean));
        [...dbAchievementPaths].filter(x => !formAchievementPaths.has(x)).forEach(x => deletionPromises.add(x));

        // --------------------------
        // ----- Delete files from disk safely -----
        // --------------------------
        await Promise.all([...deletionPromises].map(async relPath => {
            if (!relPath) return;
            try {
                const absolutePath = path.resolve(UPLOADS_DB, relPath);
                if (!absolutePath.startsWith(path.resolve(UPLOADS_DB))) return;

                const exists = await fs.promises.access(absolutePath).then(() => true).catch(() => false);
                if (!exists) return;

                await fs.promises.unlink(absolutePath);

                // remove empty folder
                const parentDir = path.dirname(absolutePath);
                const filesLeft = await fs.promises.readdir(parentDir);
                if (filesLeft.length === 0) await fs.promises.rmdir(parentDir);

            } catch (err) {
                console.warn(`⚠️ Could not delete file for ${relPath}:`, err.message);
            }
        }));

        // --------------------------
        // ----- Save Updated Data -----
        // --------------------------
        saveUserData(formData);

        res.json({ 
            success: true, 
            message: "User data updated successfully", 
            uploadedFiles 
        });

    } catch (err) {
        console.error("❌ Error in /api/user-with-files:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});



// 🔹 Get user data
app.get("/api/user", (req, res) => {
    const user = loadUserData();
    res.json(user);
});

// 🔹 Save user info without files
app.post("/api/user", (req, res) => {
    try {
        const user = req.body || {};
        saveUserData(user);
        res.json({ ok: true, message: "User data saved successfully" });
    } catch (err) {
        console.error("❌ Error saving user data:", err);
        res.status(500).json({ ok: false, message: "Failed to save user data" });
    }
});

// 🔹 Upload resumes only (without other form data)
app.post("/api/upload", upload.any(), async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ ok: false, error: "No files uploaded" });

    try {
        const user = loadUserData();
        user.resumes = user.resumes || [];

        const resumeStoredPath = path.relative(UPLOADS_DB, file.path).replace(/\\/g, "/");

        req.files.forEach(file => {
            user.resumes.push({
                resumeStoredPath,
                originalName: file.originalname,
                uploadedAt: new Date().toISOString(),
            });
        });

        saveUserData(user);

        res.json({
            ok: true,
            message: `${req.files.length} file(s) uploaded successfully.`,
            paths: req.files.map(f => `/uploads/${f.filename}`),
        });

    } catch (err) {
        console.error("❌ Error uploading files:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// 🔹 Delete user data (and optionally cleanup resumes)
app.delete("/api/user", async (req, res) => {
    try {
        const userData = loadUserData();
        // Delete all uploaded resumes
        const deletionPromises = (userData.resumeStoredPath || [])
            .filter(r => r.resumeFile)
            .map(r => deleteFileIfExists(path.join(UPLOADS_DB, r.resumeStoredPath)));
        await Promise.all(deletionPromises);

        // Clear JSON
        saveUserData({});

        res.json({ ok: true, message: "User data and resumes removed." });
    } catch (err) {
        console.error("❌ Error clearing user data:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});





app.post("/api/jobs", (req, res) => {
  const { payload } = req.body;

  console.log("Received array:", payload);

  res.json({ ok: true });
});






// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// Start Server
// -----------------------------
const server = app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT}/ in your browser`);
});

server.on("error", (err) => {
  console.error("❌ Server failed to start:", err.message);
});