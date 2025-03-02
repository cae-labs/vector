import { useEffect, useState, useCallback } from 'react';

import { Trash } from '@/components/Trash';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { FileList } from '@/components/FileList';
import { WarningBanner } from '@/components/Banner';
import { useFileSystem, FileEntry } from '@/hooks/useFileSystem';

import { openPath } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';

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
		clearNewlyCreatedPath
	} = useFileSystem();

	const [isMacOS, setIsMacOS] = useState(false);
	const [showTrash, setShowTrash] = useState(false);
	const [trashUpdateKey, setTrashUpdateKey] = useState(0);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => {
				setError(null);
			}, 3500);

			return () => clearTimeout(timer);
		}
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

	const handleOpenFile = async (file: FileEntry) => {
		if (file.is_dir) {
			if (isMacOS && file.name.endsWith('.app')) {
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
			{error && (
				<div className="cursor-default z-100 absolute bottom-12 right-5 bg-red-100 text-red-700 px-4 py-2 rounded-md border border-red-200">
					<span>{error}</span>
					<button className="p-2" onClick={() => setError(null)}>
						(close)
					</button>
				</div>
			)}

			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					onNavigate={readDirectory}
					showHidden={showHidden}
					onToggleHidden={toggleHiddenFiles}
					setShowTrash={setShowTrash}
					trashUpdateKey={trashUpdateKey}
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
								onPasteFiles={pasteItems}
								onCreateFile={createFile}
								onCreateDirectory={createDirectory}
								canPaste={canPaste}
								isLoading={isLoading}
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
