mod file;

use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_decorum::init())
        .invoke_handler(tauri::generate_handler![
            file::read_directory,
            file::get_parent_directory,
            file::create_directory,
            file::create_file,
            file::rename_item,
            file::get_home_directory,
            file::delete_item,
            file::move_to_trash,
            file::get_trash_items,
            file::restore_from_trash,
            file::file_operation,
            file::is_within_home_directory,
            file::get_drives,
        ])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.create_overlay_titlebar().unwrap();

            #[cfg(target_os = "macos")]
            main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Able to generate context for running vector");
}
