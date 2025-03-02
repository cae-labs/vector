import { useEffect, useState, useRef } from 'react';
import { ContextMenu } from '@/components/ContextMenu';
import { ContextMenuLocation } from '@/types';
import { FileEntry } from '@/hooks/useFileSystem';

import { platform } from '@tauri-apps/plugin-os';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface SidebarProps {
	onNavigate: (path: string) => void;
	showHidden: boolean;
	onToggleHidden: () => void;
	setShowTrash: (set: boolean) => void;
	trashUpdateKey: number;
}

interface UserFolder {
	name: string;
	path: string;
	icon: string;
	isHidden: boolean;
}

const COMMON_FOLDERS = [
	{ name: 'Documents', icon: '📄' },
	{ name: 'Developer', icon: '🛠️' },
	{ name: 'Downloads', icon: '⬇️' },
	{ name: 'Pictures', icon: '🖼️' },
	{ name: 'Music', icon: '🎵' },
	{ name: 'Videos', icon: '🎬' },
	{ name: 'Desktop', icon: '🖥️' },
	{ name: 'Projects', icon: '📂' },
	{ name: 'Library', icon: '📚' },
	{ name: 'Public', icon: '👥' },
	{ name: '.config', icon: '⚙️' },
	{ name: '.local', icon: '📦' }
];

export function Sidebar({ onNavigate, showHidden, onToggleHidden, setShowTrash, trashUpdateKey }: SidebarProps) {
	const [isMacOS, setIsMacOS] = useState<boolean>(false);
	const [isFullscreen, setFullScreen] = useState<boolean>(false);
	const [trashItemCount, setTrashItemCount] = useState<number>(0);

	const [showHeaderBorder, setShowHeaderBorder] = useState<boolean>(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const [homeDir, setHomeDir] = useState<string>('');
	const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
	const [drives, setDrives] = useState<string[]>([]);
	const [recents, setRecents] = useState<[]>([]);

	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		x: number;
		y: number;
		file: FileEntry | null;
	}>({
		visible: false,
		x: 0,
		y: 0,
		file: null
	});

	const handleContextMenu = (event: React.MouseEvent, folder: UserFolder) => {
		event.preventDefault();

		const fileEntry: FileEntry = {
			name: folder.name,
			path: folder.path,
			is_dir: true,
			size: 0,
			modified: '',
			file_type: 'directory',
			is_hidden: folder.isHidden
		};

		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			file: fileEntry
		});
	};

	const closeContextMenu = () => {
		setContextMenu({ ...contextMenu, visible: false });
	};

	const handlePinUnpin = (path: string, action: 'pin' | 'unpin') => {
		console.log(`${action} folder: ${path}`);
		// implement actual pinning/unpinning logic
	};

	const checkTrashItems = async () => {
		try {
			const trashItems = await invoke<FileEntry[]>('get_trash_items');
			setTrashItemCount(trashItems.length);
		} catch (error) {
			console.error('Failed to check trash items:', error);
			setTrashItemCount(0);
		}
	};

	useEffect(() => {
		let unlisten;

		const setupResizeListener = async () => {
			unlisten = await getCurrentWindow().onResized(async ({ payload: size }) => {
				const fullscreen = await getCurrentWindow().isFullscreen();
				setFullScreen(fullscreen);
			});
		};

		setupResizeListener();

		return () => {
			if (unlisten) unlisten();
		};
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			if (contentRef.current) {
				setShowHeaderBorder(contentRef.current.scrollTop > 0);
			}
		};

		const contentElement = contentRef.current;
		if (contentElement) {
			contentElement.addEventListener('scroll', handleScroll);
		}

		return () => {
			if (contentElement) {
				contentElement.removeEventListener('scroll', handleScroll);
			}
		};
	}, []);

	useEffect(() => {
		const initializeSidebar = async () => {
			try {
				const currentPlatform = platform();
				const isMac = currentPlatform === 'macos';
				setIsMacOS(isMac);

				const availableDrives = await invoke<string[]>('get_drives');
				setDrives(availableDrives);

				const homePath = await invoke<string>('get_home_directory');
				setHomeDir(homePath);

				const folders: UserFolder[] = [{ name: 'Home', path: homePath, icon: '🏠', isHidden: false }];

				if (isMac) {
					folders.push({
						name: 'Applications',
						path: '/Applications',
						icon: '📱',
						isHidden: false
					});
				}

				const entries = await invoke<any[]>('read_directory', {
					path: homePath,
					showHidden: true
				});

				for (const entry of entries) {
					if (entry.is_dir) {
						const isHidden = entry.is_hidden;
						const matchedFolder = COMMON_FOLDERS.find((folder) => folder.name.toLowerCase() === entry.name.toLowerCase());

						if (matchedFolder) {
							folders.push({
								name: entry.name,
								path: entry.path,
								icon: matchedFolder.icon,
								isHidden
							});
						}
					}
				}

				setUserFolders(folders);
				await checkTrashItems();
			} catch (error) {
				console.error('Failed to get home directory contents:', error);
			}
		};

		initializeSidebar();
	}, []);

	useEffect(() => {
		checkTrashItems();
	}, [trashUpdateKey]);

	const displayFolders = userFolders.filter((folder) => showHidden || !folder.isHidden);

	return (
		<div className="w-48 bg-stone-200 dark:bg-stone-800 border-r border-stone-400 dark:border-stone-700 flex flex-col overflow-hidden cursor-default dark:text-stone-100/90">
			<div
				data-tauri-drag-region
				className={
					!isFullscreen
						? `h-[47px] w-48 left-0 top-0 fixed bg-stone-200/70 dark:bg-stone-800/70 backdrop-blur-md border-r border-stone-400 dark:border-stone-700 ${showHeaderBorder ? 'border-b border-stone-400 dark:border-stone-950' : ''}`
						: ''
				}></div>
			<div ref={contentRef} className="flex-1 overflow-y-auto p-2 space-y-1 ">
				<div className={isMacOS && !isFullscreen ? 'mb-4 mt-11' : 'mb-4'}>
					<div className="px-2 mb-2 text-xs font-medium text-stone-500 dark:text-stone-500/60">Favorites</div>
					{displayFolders.map((folder) => (
						<button
							key={folder.path}
							onClick={() => {
								setShowTrash(false);
								onNavigate(folder.path);
							}}
							onContextMenu={(e) => handleContextMenu(e, folder)}
							className="w-full text-left px-2 py-1 rounded text-sm hover:bg-stone-100 dark:hover:bg-stone-700/50 flex items-center space-x-2">
							<span className="text-stone-400">{folder.icon}</span>
							<span>{folder.name}</span>
						</button>
					))}
				</div>

				<div className="mb-4">
					<div className="px-2 mb-2 text-xs font-medium text-stone-500 dark:text-stone-500/60">Recents</div>
					{recents.length > 0 ? (
						recents.map((file) => (
							<button
								key={file.path}
								onClick={() => {
									setShowTrash(false);
									onNavigate(file.path);
								}}
								onContextMenu={() => {}}
								className="w-full text-left px-2 py-1 rounded text-sm hover:bg-stone-100 dark:hover:bg-stone-700/50 flex items-center space-x-2">
								<span className="text-stone-400">{file.icon}</span>
								<span>{file.name}</span>
							</button>
						))
					) : (
						<div className="px-2 py-1 text-xs text-stone-400 dark:text-stone-400/70">No recent files</div>
					)}
				</div>

				{drives.length > 0 && (
					<div className="mb-4">
						<div className="px-2 mb-2 text-xs font-medium text-stone-500 dark:text-stone-500/60">Drives</div>
						{drives.map((drive) => (
							<button
								key={drive}
								onClick={() => {
									setShowTrash(false);
									onNavigate(drive);
								}}
								className="w-full text-left px-2 py-1 rounded text-sm hover:bg-stone-100 dark:hover:bg-stone-700/50 flex items-center space-x-2">
								<span className="text-stone-400">💾</span>
								<span>{isMacOS && drive == '/' ? 'My Mac' : drive}</span>
							</button>
						))}
					</div>
				)}

				{trashItemCount > 0 && (
					<div>
						<div className="px-2 mb-2 text-xs font-medium text-stone-500 dark:text-stone-500/60">System</div>
						<button
							onClick={() => setShowTrash(true)}
							className="w-full text-left px-2 py-1 rounded text-sm hover:bg-stone-100 dark:hover:bg-stone-700/50 flex items-center space-x-2">
							<span className="text-stone-400">🗑️</span>
							<span>
								Trash
								{trashItemCount > 0 && (
									<span className="inline-flex items-center justify-center w-4 h-4 ms-2 text-xs font-semibold text-stone-800 bg-stone-300 dark:bg-stone-700/70 dark:text-stone-200 rounded-full">
										{trashItemCount}
									</span>
								)}
							</span>
						</button>
					</div>
				)}
			</div>

			{contextMenu.visible && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					file={contextMenu.file}
					location={ContextMenuLocation.SIDEBAR}
					onClose={closeContextMenu}
					onOpen={() => onNavigate(contextMenu.file?.path || '')}
					onDelete={() => {}}
					onRename={() => {}}
					onCopy={() => {}}
					onCut={() => {}}
					onPaste={() => {}}
					onCreateFile={() => {}}
					onCreateFolder={() => {}}
					onPinUnpinFolder={handlePinUnpin}
					canPaste={false}
					showHidden={showHidden}
					onToggleHidden={onToggleHidden}
				/>
			)}
		</div>
	);
}
