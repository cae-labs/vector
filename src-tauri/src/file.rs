use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use tauri::command;

use std::{
    fs::{self, File},
    path::{Path, PathBuf},
};

#[derive(Deserialize)]
pub enum FileOperation {
    Copy,
    Cut,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: String,
    file_type: String,
    is_hidden: bool,
}

#[command]
pub fn file_operation(source_path: &str, destination_path: &str, operation: FileOperation) -> Result<(), String> {
    let source = PathBuf::from(source_path);

    #[cfg(not(target_os = "macos"))]
    let mut destination = PathBuf::from(destination_path);

    #[cfg(target_os = "macos")]
    let destination = PathBuf::from(destination_path);

    if !source.exists() {
        return Err(format!("Source does not exist: {}", source.display()));
    }

    if let Some(parent) = destination.parent() {
        if !parent.exists() {
            return Err(format!("Destination directory does not exist: {}", parent.display()));
        }
    }

    #[cfg(target_os = "macos")]
    {
        let source_path_escaped = source_path.replace("\"", "\\\"");

        let dst_path = Path::new(destination_path);

        let dst_folder = dst_path
            .parent()
            .ok_or("Invalid destination path provided")?
            .to_str()
            .ok_or("Unable to convert destination folder to a string")?;

        let dst_folder_escaped = dst_folder.replace("\"", "\\\"");

        let dst_filename = dst_path.file_name().ok_or("Invalid destination file name provided")?.to_string_lossy().to_string();

        let dst_filename_escaped = dst_filename.replace("\"", "\\\"");

        let script = match operation {
            FileOperation::Copy => {
                format!(
                    r#"
tell application "Finder"
    set sourceFile to (POSIX file "{}") as alias
    set destinationFolder to (POSIX file "{}") as alias
    set duplicateFile to duplicate sourceFile to destinationFolder with replacing
    set name of duplicateFile to "{}"
end tell
                        "#,
                    source_path_escaped, dst_folder_escaped, dst_filename_escaped
                )
            }
            FileOperation::Cut => format!(
                r#"
tell application "Finder"
    set sourceFile to (POSIX file "{}") as alias
    set destinationFolder to (POSIX file "{}") as alias
    set movedFile to move sourceFile to destinationFolder
    set name of movedFile to "{}"
end tell
                    "#,
                source_path_escaped, dst_folder_escaped, dst_filename_escaped
            ),
        };

        std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute osascript: {}", e))?;

        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        if source.is_dir() && destination.starts_with(&source) {
            return Err(format!("Cannot copy directory '{}' around itself ('{}')", source.display(), destination.display()));
        }

        if source == destination {
            let filename = source.file_stem().unwrap_or_default().to_string_lossy();
            let extension = source.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default().to_string();
            let new_filename = format!("{} copy{}", filename, extension);
            destination = if let Some(parent) = source.parent() { parent.join(new_filename) } else { new_filename.into() };
        }

        match operation {
            FileOperation::Copy => {
                if source.is_dir() {
                    copy_dir_all(&source, &destination).map_err(|e| e.to_string())?;
                } else {
                    fs::copy(&source, &destination).map_err(|e| e.to_string())?;
                }
                Ok(())
            }

            FileOperation::Cut => {
                fs::rename(&source, &destination).map_err(|e| e.to_string())?;
                Ok(())
            }
        }
    }
}

#[command]
pub fn read_directory(path: &str, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut file_entries = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        let is_hidden = file_name.starts_with(".") || {
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::fs::MetadataExt;
                const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
                entry.metadata().map(|m| (m.file_attributes() & FILE_ATTRIBUTE_HIDDEN) != 0).unwrap_or(false)
            }
            #[cfg(not(target_os = "windows"))]
            {
                false
            }
        };

        if !show_hidden && is_hidden {
            continue;
        }

        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let file_path = entry.path().to_string_lossy().to_string();
        let is_dir = metadata.is_dir();
        let size = if is_dir { 0 } else { metadata.len() };

        let modified: DateTime<Local> = metadata.modified().map_err(|e| e.to_string())?.into();

        let file_type = if is_dir {
            "directory".to_string()
        } else {
            match Path::new(&file_name).extension() {
                Some(ext) => ext.to_string_lossy().to_string(),
                None => "file".to_string(),
            }
        };

        file_entries.push(FileEntry {
            name: file_name,
            path: file_path,
            is_dir,
            size,
            modified: modified.format("%Y-%m-%d %H:%M:%S").to_string(),
            file_type,
            is_hidden,
        });
    }

    file_entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(file_entries)
}

#[command]
pub fn get_parent_directory(path: &str) -> Result<String, String> {
    let path_buf = PathBuf::from(path);

    match path_buf.parent() {
        Some(parent) => Ok(parent.to_string_lossy().to_string()),
        None => Ok(path.to_string()),
    }
}

#[command]
pub fn create_directory(path: &str, name: &str) -> Result<(), String> {
    let new_dir = Path::new(path).join(name);
    fs::create_dir(new_dir).map_err(|e| e.to_string())
}

#[command]
pub fn create_file(path: &str, name: &str) -> Result<(), String> {
    let file_path = Path::new(path).join(name);
    File::create(file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn move_to_trash(path: &str) -> Result<(), String> { trash::delete(path).map_err(|e| e.to_string()) }

#[command]
pub fn delete_item(path: &str) -> Result<(), String> {
    let path = Path::new(path);

    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[command]
pub fn rename_item(path: &str, new_name: &str) -> Result<String, String> {
    let path = Path::new(path);
    let parent = path.parent().ok_or("Cannot get parent directory")?;
    let new_path = parent.join(new_name);

    fs::rename(path, &new_path).map_err(|e| e.to_string())?;

    Ok(new_path.to_string_lossy().to_string())
}

#[command]
pub fn get_home_directory() -> Result<String, String> {
    match dirs::home_dir() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("Could not determine home directory".to_string()),
    }
}

#[command]
pub fn is_within_home_directory(path: &str) -> Result<bool, String> {
    let path = Path::new(path);
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    Ok(path.starts_with(&home))
}

#[cfg(target_os = "windows")]
#[command]
pub fn get_drives() -> Result<Vec<String>, String> {
    use std::process::Command;

    let output = Command::new("wmic").args(["logicaldisk", "get", "caption"]).output().map_err(|e| e.to_string())?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let drives: Vec<String> = output_str
        .lines()
        .skip(1)
        .filter_map(|line| {
            let drive = line.trim();
            if !drive.is_empty() {
                Some(format!("{}\\", drive))
            } else {
                None
            }
        })
        .collect();

    Ok(drives)
}

#[cfg(not(target_os = "windows"))]
#[command]
pub fn get_drives() -> Result<Vec<String>, String> {
    // improve and show all drives
    Ok(vec!["/".to_string()])
}

#[cfg(target_os = "macos")]
#[command]
pub async fn get_trash_items() -> Result<Vec<FileEntry>, String> {
    let trash_path = get_macos_trash_path().ok_or_else(|| "Could not determine trash path".to_string())?;

    let mut entries = Vec::new();
    let dir_entries = fs::read_dir(&trash_path).map_err(|e| format!("Failed to read trash directory: {}", e))?;

    for entry in dir_entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;

        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("Unknown").to_string();

        if name == ".DS_Store" {
            continue;
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        entries.push(FileEntry {
            modified,
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            file_type: if metadata.is_dir() { "directory".to_string() } else { "file".to_string() },
            is_hidden: name.starts_with('.'),
        });
    }

    Ok(entries)
}

#[cfg(not(target_os = "macos"))]
#[command]
pub async fn get_trash_items() -> Result<Vec<FileEntry>, String> {
    let trash_dir = trash::os_limited::list().map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for item in trash_dir {
        let path = item.id.display().to_string();
        let name = item.name.unwrap_or_else(|| path.clone());

        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        entries.push(FileEntry {
            name,
            path,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified,
            file_type: if metadata.is_dir() { "directory".to_string() } else { "file".to_string() },
            is_hidden: false,
        });
    }

    Ok(entries)
}

#[cfg(target_os = "macos")]
#[command]
pub async fn restore_from_trash(path: &str) -> Result<(), String> {
    let trash_path = get_macos_trash_path().ok_or_else(|| "Could not determine trash path".to_string())?;

    let path = Path::new(path);
    if !path.starts_with(&trash_path) {
        return Err("File is not in trash".to_string());
    }

    if let Some(file_name) = path.file_name() {
        let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
        let dest = home.join(file_name);

        if dest.exists() {
            return Err("A file with this name already exists in the destination".to_string());
        }

        fs::rename(path, &dest).map_err(|e| format!("Failed to restore file: {}", e))?;

        Ok(())
    } else {
        Err("Invalid file path".to_string())
    }
}

#[cfg(not(target_os = "macos"))]
#[command]
pub async fn restore_from_trash(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    if let Some(file_name) = path.file_name() {
        let dest = Path::new("/").join(file_name);
        if let Err(e) = std::fs::rename(path, dest) {
            return Err(format!("Failed to restore file: {}", e));
        }
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn get_macos_trash_path() -> Option<std::path::PathBuf> { dirs::home_dir().map(|home| home.join(".Trash")) }

#[cfg(not(target_os = "macos"))]
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}
