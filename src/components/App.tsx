import { useEffect, useState } from 'react';

import { Trash } from '@/components/Trash';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { FileList } from '@/components/FileList';
import { WarningBanner } from '@/components/Banner';
import { KeybindBadge } from '@/components/Badge';
import { useFileSystem, FileEntry } from '@/hooks/useFileSystem';

import { openPath } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';

const FileManagerToggle = ({ showHidden, isMacOS }) => {
	const keybind = isMacOS ? '⌘+H' : 'Ctrl+H';
	const message = showHidden ? 'Hide hidden' : 'Show hidden';

	return (
		<div className="flex items-center space-x-2">
			<span>{message}</span>
			<KeybindBadge>{keybind}</KeybindBadge>
		</div>
	);
};

function App() {
	const {
		currentPath,
		files,
		isLoading,
		error,
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
		initDirectory
	} = useFileSystem();

	const [isMacOS, setIsMacOS] = useState(false);
	const [showTrash, setShowTrash] = useState(false);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useEffect(() => {
		const initializeApp = async () => {
			const homePath = await getHomeDirectory();
			if (homePath) {
				await initDirectory(homePath);
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

	return (
		<div className="flex flex-col h-screen bg-white">
			{error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

			<div className="flex flex-1 overflow-hidden">
				<Sidebar onNavigate={readDirectory} showHidden={showHidden} onToggleHidden={toggleHiddenFiles} setShowTrash={setShowTrash} />

				<div className="flex-1 flex flex-col overflow-hidden">
					{!showTrash ? (
						<>
							<Navbar
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
								onDeleteFile={deleteItem}
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
							/>
						</>
					) : (
						<Trash onClose={() => setShowTrash(false)} />
					)}
				</div>
			</div>

			<div className="cursor-default bg-gray-100 px-2.5 py-1.5 border-t text-xs text-gray-500 flex justify-between">
				{/* make the currentPath navigateble  */}
				<span>
					{files.length} items <span className="text-[10px] text-gray-400">{currentPath}</span>
				</span>
				<FileManagerToggle showHidden={showHidden} isMacOS={isMacOS} />
			</div>
		</div>
	);
}

export default App;
