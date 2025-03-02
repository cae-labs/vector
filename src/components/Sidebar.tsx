import { useEffect, useState } from 'react';
import { ContextMenu } from '@/components/ContextMenu';
import { ContextMenuLocation } from '@/types';
import { FileEntry } from '@/hooks/useFileSystem';

import { platform } from '@tauri-apps/plugin-os';
import { invoke } from '@tauri-apps/api/core';

interface SidebarProps {
	onNavigate: (path: string) => void;
	showHidden: boolean;
}

const COMMON_FOLDERS = [
	{ name: 'Documents', icon: '📄' },
	{ name: 'Downloads', icon: '⬇️' },
	{ name: 'Pictures', icon: '🖼️' },
	{ name: 'Music', icon: '🎵' },
	{ name: 'Videos', icon: '🎬' },
	{ name: 'Desktop', icon: '🖥️' },
	{ name: 'Projects', icon: '📂' },
	{ name: 'Library', icon: '📚' },
	{ name: 'Public', icon: '👥' },
	{ name: 'Public', icon: '👥' },
	{ name: '.config', icon: '⚙️' },
	{ name: '.local', icon: '📦' }
];

interface UserFolder {
	name: string;
	path: string;
	icon: string;
	isHidden: boolean;
}

export function Sidebar({ onNavigate, showHidden, onToggleHidden }: SidebarProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [isMacOS, setIsMacOS] = useState<boolean>(false);

	const [homeDir, setHomeDir] = useState<string>('');
	const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
	const [drives, setDrives] = useState<string[]>([]);

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

	useEffect(() => {
		const initializeSidebar = async () => {
			try {
				setIsLoading(true);

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
			} catch (error) {
				console.error('Failed to get home directory contents:', error);
			} finally {
				setIsLoading(false);
			}
		};

		initializeSidebar();
	}, [showHidden]);

	const displayFolders = userFolders.filter((folder) => showHidden || !folder.isHidden);

	return (
		<div className="cursor-default w-48 flex-shrink-0 bg-gray-100 border-r overflow-y-auto">
			<div className="p-3">
				<h2 className="font-bold text-gray-700 mb-2">Favorites</h2>

				{isLoading ? (
					<div className="flex justify-center py-4">
						<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
					</div>
				) : (
					<ul>
						{displayFolders.map((folder) => (
							<li key={folder.path}>
								<button
									onClick={() => onNavigate(folder.path)}
									onContextMenu={(e) => handleContextMenu(e, folder)}
									className={`w-full text-left p-2 hover:bg-gray-200 rounded flex items-center 
					  ${folder.isHidden ? 'text-gray-500 italic opacity-60' : ''}`}>
									<span className="mr-2">{folder.icon}</span>
									{folder.name}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="p-3 border-t">
				<h2 className="font-bold text-gray-700 mb-2">Recent Files</h2>
				<p className="text-sm text-gray-500 italic">Coming soon</p>
			</div>

			{drives.length > 0 && (
				<div className="p-3">
					<h2 className="font-bold text-gray-700 mb-2">Drives</h2>
					<ul>
						{drives.map((drive) => (
							<li key={drive}>
								<button onClick={() => onNavigate(drive)} className="w-full text-left p-2 hover:bg-gray-200 rounded flex items-center">
									<span className="mr-2">💾</span> {drive}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="p-3 border-t">
				<h2 className="font-bold text-gray-700 mb-2">Future Features</h2>
				<ul className="text-sm text-gray-600">
					<li className="pl-2 py-1">🔍 AI Search</li>
					<li className="pl-2 py-1">🔄 AI Sort</li>
					<li className="pl-2 py-1">📊 Directory Summary</li>
				</ul>
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
