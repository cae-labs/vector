import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback, useRef } from 'react';

export interface FileEntry {
	name: string;
	path: string;
	is_dir: boolean;
	size: number;
	modified: string;
	file_type: string;
	is_hidden: boolean;
}

type ClipboardOperation = 'Copy' | 'Cut';

export function useFileSystem() {
	const [currentPath, setCurrentPath] = useState<string>('');
	const [files, setFiles] = useState<FileEntry[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [showHidden, setShowHidden] = useState<boolean>(false);
	const [isOutsideHomeDir, setIsOutsideHomeDir] = useState<boolean>(false);
	const [canPaste, setCanPaste] = useState<boolean>(false);
	const [newlyCreatedPath, setNewlyCreatedPath] = useState<string | null>(null);

	const historyRef = useRef<string[]>([]);
	const historyIndexRef = useRef<number>(-1);
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);

	const clipboard = useRef<{
		operation: ClipboardOperation | null;
		path: string | null;
	}>({
		operation: null,
		path: null
	});

	const updateNavigationState = useCallback(() => {
		setCanGoBack(historyIndexRef.current > 0);
		setCanGoForward(historyIndexRef.current < historyRef.current.length - 1);
	}, []);

	const checkIfOutsideHomeDir = useCallback(async (path: string) => {
		try {
			const isWithin = await invoke<boolean>('is_within_home_directory', { path });
			setIsOutsideHomeDir(!isWithin);
		} catch (error) {
			console.error('Failed to check home directory:', error);
			setIsOutsideHomeDir(false);
		}
	}, []);

	const loadDirectory = useCallback(
		async (path: string) => {
			setIsLoading(true);
			setError(null);
			try {
				const entries = await invoke<FileEntry[]>('read_directory', {
					path,
					showHidden
				});
				setFiles(entries);
				setCurrentPath(path);

				await checkIfOutsideHomeDir(path);
			} catch (err) {
				setError(err as string);
			} finally {
				setIsLoading(false);
			}
		},
		[showHidden, checkIfOutsideHomeDir]
	);

	const initDirectory = useCallback(
		async (path: string) => {
			await loadDirectory(path);

			historyRef.current = [path];
			historyIndexRef.current = 0;
			updateNavigationState();
		},
		[loadDirectory, updateNavigationState]
	);

	const readDirectory = useCallback(
		async (path: string, addToHistory = true) => {
			await loadDirectory(path);

			if (addToHistory) {
				historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
				historyRef.current.push(path);
				historyIndexRef.current = historyRef.current.length - 1;
				updateNavigationState();
			}
		},
		[loadDirectory, updateNavigationState]
	);

	const navigateUp = useCallback(async () => {
		try {
			const parentPath = await invoke<string>('get_parent_directory', { path: currentPath });
			readDirectory(parentPath);
		} catch (err) {
			setError(err as string);
		}
	}, [currentPath, readDirectory]);

	const goBack = useCallback(async () => {
		if (historyIndexRef.current > 0) {
			historyIndexRef.current--;
			const previousPath = historyRef.current[historyIndexRef.current];
			await loadDirectory(previousPath);
			updateNavigationState();
		}
	}, [loadDirectory, updateNavigationState]);

	const goForward = useCallback(async () => {
		if (historyIndexRef.current < historyRef.current.length - 1) {
			historyIndexRef.current++;
			const nextPath = historyRef.current[historyIndexRef.current];
			await loadDirectory(nextPath);
			updateNavigationState();
		}
	}, [loadDirectory, updateNavigationState]);

	const getHomeDirectory = useCallback(async () => {
		try {
			return await invoke<string>('get_home_directory');
		} catch (err) {
			setError(err as string);
			return '';
		}
	}, []);

	const createDirectory = useCallback(
		async (name: string) => {
			try {
				await invoke('create_directory', { path: currentPath, name });
				const newPath = `${currentPath}/${name}`;
				setNewlyCreatedPath(newPath);
				loadDirectory(currentPath);
			} catch (err) {
				setError(err as string);
			}
		},
		[currentPath, loadDirectory]
	);

	const createFile = useCallback(
		async (name: string) => {
			try {
				await invoke('create_file', { path: currentPath, name });
				const newPath = `${currentPath}/${name}`;
				setNewlyCreatedPath(newPath);
				loadDirectory(currentPath);
			} catch (err) {
				setError(err as string);
			}
		},
		[currentPath, loadDirectory]
	);

	const deleteItem = useCallback(
		async (path: string) => {
			try {
				await invoke('move_to_trash', { path });
				loadDirectory(currentPath);
			} catch (err) {
				setError(err as string);
			}
		},
		[currentPath, loadDirectory]
	);

	const renameItem = useCallback(
		async (path: string, newName: string) => {
			try {
				await invoke('rename_item', { path, newName });
				loadDirectory(currentPath);
			} catch (err) {
				setError(err as string);
			}
		},
		[currentPath, loadDirectory]
	);

	const toggleHiddenFiles = useCallback(() => {
		setShowHidden((prev) => !prev);
		if (currentPath) {
			loadDirectory(currentPath);
		}
	}, [currentPath, loadDirectory]);

	const copyToClipboard = useCallback((path: string, operation: ClipboardOperation) => {
		clipboard.current = { operation, path };
		setCanPaste(true);
	}, []);

	const copyItem = useCallback(
		(path: string) => {
			copyToClipboard(path, 'Copy');
		},
		[copyToClipboard]
	);

	const cutItem = useCallback(
		(path: string) => {
			copyToClipboard(path, 'Cut');
		},
		[copyToClipboard]
	);

	const pasteItems = useCallback(async () => {
		if (!clipboard.current.path || !clipboard.current.operation) return;

		const sourcePath = clipboard.current.path;
		const operation = clipboard.current.operation;

		try {
			const fileName = sourcePath.split(/[/\\]/).pop() || 'Unknown';
			const destinationPath = `${currentPath}/${fileName}`;

			await invoke('file_operation', {
				sourcePath,
				destinationPath,
				operation
			});

			if (operation === 'cut') {
				clipboard.current = { operation: null, path: null };
				setCanPaste(false);
			}

			setNewlyCreatedPath(destinationPath);
			loadDirectory(currentPath);
		} catch (err) {
			setError(err as string);
		}
	}, [currentPath, loadDirectory]);

	return {
		currentPath,
		files,
		isLoading,
		error,
		showHidden,
		readDirectory,
		navigateUp,
		getHomeDirectory,
		createDirectory,
		createFile,
		deleteItem,
		renameItem,
		copyItem,
		cutItem,
		pasteItems,
		canPaste,
		toggleHiddenFiles,
		goBack,
		goForward,
		canGoBack,
		canGoForward,
		isOutsideHomeDir,
		initDirectory,
		loadDirectory,
		newlyCreatedPath,
		clearNewlyCreatedPath: () => setNewlyCreatedPath(null)
	};
}
