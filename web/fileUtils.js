// fileUtils.js

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

/**
 * Minimal fs utility functions
 */
const fileUtils = {
  /**
   * List directories or files in a folder
   * @param {string} dirPath - Path to directory
   * @param {Object} options - Optional flags
   * @param {boolean} options.onlyDirs - If true, return only directories
   * @param {boolean} options.onlyFiles - If true, return only files
   * @returns {Promise<string[]>} Array of names
   */
  async list(dirPath, { onlyDirs = false, onlyFiles = false } = {}) {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });

    return entries
      .filter(entry => {
        if (onlyDirs) return entry.isDirectory();
        if (onlyFiles) return entry.isFile();
        return true;
      })
      .map(entry => entry.name);
  },

  /**
   * Ensure a directory exists (creates if missing)
   * @param {string} dirPath
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  },

  /**
   * Delete a file if it exists
   * @param {string} filePath
   * @returns {Promise<boolean>} True if deleted, false if didn't exist
   */
  async deleteFile(filePath) {
    try {
      await fsPromises.access(filePath);
      await fsPromises.unlink(filePath);
      return true;
    } catch (err) {
      if (err.code === "ENOENT") return false; // File does not exist
      throw err;
    }
  },

  /**
   * Read JSON file safely
   * @param {string} filePath
   * @returns {Promise<any>} Parsed JSON or null if not found/invalid
   */
  async readJSON(filePath) {
    try {
      const data = await fsPromises.readFile(filePath, "utf-8");
      return JSON.parse(data || "{}");
    } catch (err) {
      return null;
    }
  },

  /**
   * Write object to JSON file
   * @param {string} filePath
   * @param {any} data
   * @returns {Promise<void>}
   */
  async writeJSON(filePath, data) {
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
};

export default fileUtils;
