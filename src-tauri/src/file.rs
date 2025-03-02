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
    let source = Path::new(source_path);
    let destination = Path::new(destination_path);

    if !source.exists() {
        return Err(format!("Source does not exist: {}", source.display()));
    }

    if let Some(parent) = destination.parent() {
        if !parent.exists() {
            return Err(format!("Destination directory does not exist: {}", parent.display()));
        }
    }

    match operation {
        FileOperation::Copy => {
            if source.is_dir() {
                copy_dir_all(source, destination).map_err(|e| e.to_string())?;
            } else {
                fs::copy(source, destination).map_err(|e| e.to_string())?;
            }
            Ok(())
        }

        FileOperation::Cut => {
            fs::rename(source, destination).map_err(|e| e.to_string())?;
            Ok(())
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

    // Sort directories first, then by name
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

#[command]
pub fn get_drives() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("wmic").args(["logicaldisk", "get", "caption"]).output().map_err(|e| e.to_string())?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let drives: Vec<String> = output_str
            .lines()
            .skip(1) // Skip the header line
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
    {
        Ok(vec!["/".to_string()])
    }
}

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
