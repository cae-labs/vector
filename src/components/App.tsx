import { useEffect, useState, useCallback } from 'react';

import { Trash } from '@/components/Trash';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { FileList } from '@/components/FileList';
import { WarningBanner } from '@/components/Banner';

import { useFileSystem, FileEntry } from '@/hooks/useFileSystem';
import { useInterval } from '@/hooks/useInterval';

import { openPath } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';
import toast, { Toaster } from 'react-hot-toast';

const AUTO_REFRESH_INTERVAL = 15000;

function App() {
	const {
		currentPath,
		files,
		isLoading,
		error,
		setError,
		readDirectory,
		navigateUp,
		getHomeDirectory,
		createDirectory,
		deleteItem,
		renameItem,
		copyItem,
		cutItem,
		pasteItems,
		canPaste,
		showHidden,
		toggleHiddenFiles,
		createFile,
		goBack,
		goForward,
		canGoBack,
		canGoForward,
		isOutsideHomeDir,
		initDirectory,
		loadDirectory,
		newlyCreatedPath,
		clearNewlyCreatedPath,
		refreshDirectory
	} = useFileSystem();

	const [isMacOS, setIsMacOS] = useState(false);
	const [showTrash, setShowTrash] = useState(false);
	const [trashUpdateKey, setTrashUpdateKey] = useState(0);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useInterval(() => {
		if (!showTrash && currentPath) {
			refreshDirectory();
		}
	}, AUTO_REFRESH_INTERVAL);

	useEffect(() => {
		if (error) toast.error(error, { duration: 3000, position: 'bottom-right' });
	}, [error]);

	useEffect(() => {
		const initializeApp = async () => {
			const homePath = await getHomeDirectory();
			if (homePath && !currentPath) {
				await initDirectory(homePath);
			} else if (currentPath) {
				await loadDirectory(currentPath);
			}
		};

		initializeApp();
	}, [getHomeDirectory, initDirectory]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (((!isMacOS && event.ctrlKey) || event.metaKey) && event.key === 'h') {
				event.preventDefault();
				toggleHiddenFiles();
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [toggleHiddenFiles]);

	const handleOpenFile = async (file: FileEntry, open_app: boolean = false) => {
		if (file.is_dir) {
			if (isMacOS && file.name.endsWith('.app') && !open_app) {
				await openPath(file.path);
			} else {
				readDirectory(file.path);
			}
		} else {
			await openPath(file.path);
		}
	};

	const handleDeleteItem = useCallback(
		async (path: string) => {
			await deleteItem(path);
			setTrashUpdateKey((prev) => prev + 1);
		},
		[deleteItem]
	);

	return (
		<div className="flex flex-col h-screen bg-white dark:bg-stone-900">
			<Toaster />

			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					onNavigate={readDirectory}
					showHidden={showHidden}
					onToggleHidden={toggleHiddenFiles}
					showTrash={showTrash}
					setShowTrash={setShowTrash}
					trashUpdateKey={trashUpdateKey}
					currentPath={currentPath}
				/>

				<div className="flex-1 flex flex-col overflow-hidden">
					{!showTrash ? (
						<>
							<Navbar
								data-tauri-drag-region
								currentPath={currentPath}
								onBack={goBack}
								onForward={goForward}
								onNavigateUp={navigateUp}
								canGoBack={canGoBack}
								canGoForward={canGoForward}
							/>

							{isOutsideHomeDir && <WarningBanner message="You are browsing outside your home directory. System files may be sensitive." />}

							<FileList
								files={files}
								currentPath={currentPath}
								onOpenFile={handleOpenFile}
								onDeleteFile={handleDeleteItem}
								onRenameFile={renameItem}
								onCopyFile={copyItem}
								onCutFile={cutItem}
								refreshDirectory={refreshDirectory}
								onNavigate={readDirectory}
								onPasteFiles={pasteItems}
								onCreateFile={createFile}
								onCreateDirectory={createDirectory}
								canPaste={canPaste}
								showHidden={showHidden}
								onToggleHidden={toggleHiddenFiles}
								newlyCreatedPath={newlyCreatedPath}
								clearNewlyCreatedPath={clearNewlyCreatedPath}
							/>
						</>
					) : (
						<>
							<Navbar
								data-tauri-drag-region
								currentPath={'Trash'}
								onBack={() => setShowTrash(false)}
								onNavigateUp={() => {}}
								canNavigateUp={false}
								canGoBack={true}
								canGoForward={false}
							/>

							<Trash onTrashUpdate={() => setTrashUpdateKey((prev) => prev + 1)} setShowTrash={setShowTrash} showHidden={showHidden} />
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
