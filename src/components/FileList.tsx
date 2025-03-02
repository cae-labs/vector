import { useState, useEffect, useRef, MouseEvent } from 'react';
import { ContextMenuLocation } from '@/types';
import { platform } from '@tauri-apps/plugin-os';
import { load } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

import { FileItem } from '@/components/FileItem';
import { ContextMenu } from '@/components/ContextMenu';
import { StatusBar } from '@/components/StatusBar';
import { FileEntry } from '@/hooks/useFileSystem';
import { ChevronUp, ChevronDown, Folder, FileText } from 'lucide-react';

const storePromise = load('vector-settings.json', { autoSave: false });

export enum SortOption {
	NAME_ASC = 'name_asc',
	NAME_DESC = 'name_desc',
	DATE_ASC = 'date_asc',
	DATE_DESC = 'date_desc',
	SIZE_ASC = 'size_asc',
	SIZE_DESC = 'size_desc'
}

const MIN_ZOOM = 0.95;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

interface FileListProps {
	files: FileEntry[];
	currentPath: string;
	onOpenFile: (file: FileEntry) => void;
	onDeleteFile: (path: string) => void;
	onRenameFile: (path: string, newName: string) => void;
	onCopyFile: (path: string) => void;
	onCutFile: (path: string) => void;
	onPasteFiles: () => void;
	onCreateFile: (name: string) => void;
	onCreateDirectory: (name: string) => void;
	canPaste: boolean;
	showHidden: boolean;
	refreshDirectory: () => void;
	onToggleHidden: () => void;
	restoreFromTrash?: (path: string) => void;
	permanentlyDelete?: (path: string) => void;
	newlyCreatedPath?: string | null;
	clearNewlyCreatedPath?: () => void;
	onNavigate: (path: string) => void;
}

export function FileList({
	files,
	currentPath,
	onOpenFile,
	onDeleteFile,
	onRenameFile,
	onCopyFile,
	onCutFile,
	onPasteFiles,
	onCreateFile,
	onCreateDirectory,
	canPaste,
	showHidden,
	onToggleHidden,
	restoreFromTrash,
	permanentlyDelete,
	newlyCreatedPath,
	refreshDirectory,
	clearNewlyCreatedPath,
	onNavigate
}: FileListProps) {
	const isLoadingPreference = useRef(false);

	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		x: number;
		y: number;
		file: FileEntry | null;
		location: ContextMenuLocation;
	}>({
		visible: false,
		x: 0,
		y: 0,
		file: null,
		location: ContextMenuLocation.EMPTY_SPACE
	});

	const [isMacOS, setIsMacOS] = useState(false);
	const fileListContainerRef = useRef<HTMLDivElement>(null);
	const fileItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const [zoomLevel, setZoomLevel] = useState<number>(1.05);
	const [renamingFile, setRenamingFile] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState<string>('');

	const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	const [creatingItem, setCreatingItem] = useState<{
		type: 'file' | 'folder' | null;
		name: string;
	}>({ type: null, name: '' });

	const [sortOption, setSortOption] = useState<SortOption>(SortOption.NAME_ASC);
	const [storeInstance, setStoreInstance] = useState<any>(null);

	const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
	const [expandedContents, setExpandedContents] = useState<Record<string, FileEntry[]>>({});
	const [isLoadingExpanded, setIsLoadingExpanded] = useState<Record<string, boolean>>({});

	useEffect(() => {
		const initStore = async () => {
			try {
				const store = await storePromise;
				setStoreInstance(store);

				const savedZoom = await store.get('zoom-level');
				if (savedZoom) {
					setZoomLevel(savedZoom);
				}

				const savedExpandedFolders = await store.get('expanded-folders');
				if (savedExpandedFolders) {
					setExpandedFolders(savedExpandedFolders);
				}
			} catch (error) {
				console.error('Failed to initialize store:', error);
			}
		};

		initStore();
	}, []);

	useEffect(() => {
		if (!storeInstance) return;

		const saveZoomLevel = async () => {
			try {
				await storeInstance.set('zoom-level', zoomLevel);
				await storeInstance.save();
			} catch (error) {
				console.error('Failed to save zoom level:', error);
			}
		};

		saveZoomLevel();
	}, [zoomLevel, storeInstance]);

	useEffect(() => {
		if (!storeInstance) return;

		const saveExpandedFolders = async () => {
			try {
				await storeInstance.set('expanded-folders', expandedFolders);
				await storeInstance.save();
			} catch (error) {
				console.error('Failed to save expanded folders:', error);
			}
		};

		saveExpandedFolders();
	}, [expandedFolders, storeInstance]);

	useEffect(() => {
		if (!storeInstance || !currentPath) return;

		const loadPreference = async () => {
			try {
				isLoadingPreference.current = true;
				const preference = await storeInstance.get(`sort-${currentPath}`);

				if (preference) {
					setSortOption(preference);
				} else {
					setSortOption(SortOption.NAME_ASC);
				}
				setTimeout(() => {
					isLoadingPreference.current = false;
				}, 100);
			} catch (error) {
				console.error('Failed to load preference:', error);
				isLoadingPreference.current = false;
			}
		};

		loadPreference();
	}, [currentPath, storeInstance]);

	useEffect(() => {
		if (!storeInstance || !currentPath || isLoadingPreference.current) return;

		const savePreference = async () => {
			try {
				await storeInstance.set(`sort-${currentPath}`, sortOption);
				await storeInstance.save();
			} catch (error) {
				console.error('Failed to save preference:', error);
			}
		};

		savePreference();
	}, [sortOption, currentPath, storeInstance]);

	useEffect(() => {
		const loadExpandedFolderContents = async () => {
			for (const [folderPath, isExpanded] of Object.entries(expandedFolders)) {
				if (isExpanded && !expandedContents[folderPath] && !isLoadingExpanded[folderPath]) {
					try {
						setIsLoadingExpanded((prev) => ({ ...prev, [folderPath]: true }));

						const entries = await invoke<FileEntry[]>('read_directory', {
							path: folderPath,
							showHidden
						});

						setExpandedContents((prev) => ({
							...prev,
							[folderPath]: entries
						}));
					} catch (error) {
						console.error(`Failed to load contents for ${folderPath}:`, error);
					} finally {
						setIsLoadingExpanded((prev) => ({ ...prev, [folderPath]: false }));
					}
				}
			}
		};

		loadExpandedFolderContents();
	}, [expandedFolders, showHidden]);

	useEffect(() => {
		setExpandedContents({});
	}, [showHidden]);

	useEffect(() => {
		const refreshExpandedContents = async () => {
			const refreshedContents: Record<string, FileEntry[]> = {};

			for (const [folderPath, isExpanded] of Object.entries(expandedFolders)) {
				if (isExpanded) {
					try {
						const entries = await invoke<FileEntry[]>('read_directory', {
							path: folderPath,
							showHidden
						});

						refreshedContents[folderPath] = entries;
					} catch (error) {
						console.error(`Failed to refresh contents for ${folderPath}:`, error);
					}
				}
			}

			setExpandedContents(refreshedContents);
		};

		if (Object.keys(expandedFolders).some((path) => expandedFolders[path])) {
			refreshExpandedContents();
		}
	}, [files, showHidden]);

	const getSortedFiles = () => {
		return [...files].sort((a, b) => {
			switch (sortOption) {
				case SortOption.NAME_ASC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return a.name.localeCompare(b.name);

				case SortOption.NAME_DESC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return b.name.localeCompare(a.name);

				case SortOption.DATE_ASC:
					return new Date(a.modified).getTime() - new Date(b.modified).getTime();

				case SortOption.DATE_DESC:
					return new Date(b.modified).getTime() - new Date(a.modified).getTime();

				case SortOption.SIZE_ASC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return a.size - b.size;

				case SortOption.SIZE_DESC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return b.size - a.size;

				default:
					return 0;
			}
		});
	};

	const getSortedExpandedContents = (contents: FileEntry[]) => {
		return [...contents].sort((a, b) => {
			switch (sortOption) {
				case SortOption.NAME_ASC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return a.name.localeCompare(b.name);

				case SortOption.NAME_DESC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return b.name.localeCompare(a.name);

				case SortOption.DATE_ASC:
					return new Date(a.modified).getTime() - new Date(b.modified).getTime();

				case SortOption.DATE_DESC:
					return new Date(b.modified).getTime() - new Date(a.modified).getTime();

				case SortOption.DATE_DESC:
					return new Date(b.modified).getTime() - new Date(a.modified).getTime();

				case SortOption.SIZE_ASC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return a.size - b.size;

				case SortOption.SIZE_DESC:
					if (a.is_dir && !b.is_dir) return -1;
					if (!a.is_dir && b.is_dir) return 1;
					return b.size - a.size;

				default:
					return 0;
			}
		});
	};

	const handleSortChange = (option: SortOption) => {
		setSortOption(option);
	};

	const increaseZoom = () => {
		setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
	};

	const decreaseZoom = () => {
		setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
	};

	const resetZoom = () => {
		setZoomLevel(1.05);
	};

	const getSortIndicator = (baseSortType: string) => {
		if (sortOption.startsWith(baseSortType)) {
			return sortOption.endsWith('_asc') ? (
				<ChevronUp className="inline -mt-0.5 ml-1" size={14} />
			) : (
				<ChevronDown className="inline -mt-0.5 ml-1" size={14} />
			);
		}
		return '';
	};

	const toggleSort = (baseSortType: string) => {
		if (sortOption === `${baseSortType}_asc`) {
			handleSortChange(`${baseSortType}_desc` as SortOption);
		} else {
			handleSortChange(`${baseSortType}_asc` as SortOption);
		}
	};

	const handleFileContextMenu = (event: MouseEvent, file: FileEntry) => {
		event.preventDefault();
		event.stopPropagation();
		setSelectedItem(file.path);
		setSelectedFile(file);
		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			file: file,
			location: ContextMenuLocation.FILE_LIST
		});
	};

	const handleBackgroundContextMenu = (event: MouseEvent) => {
		event.preventDefault();
		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			file: null,
			location: ContextMenuLocation.EMPTY_SPACE
		});
	};

	const closeContextMenu = () => {
		setContextMenu({ ...contextMenu, visible: false });
	};

	const startRenaming = (file: FileEntry) => {
		setRenamingFile(file.path);
		setNewFileName(file.name);
	};

	const saveRename = () => {
		if (renamingFile && newFileName.trim()) {
			onRenameFile(renamingFile, newFileName.trim());
			setRenamingFile(null);
		}
	};

	const cancelRename = () => {
		setRenamingFile(null);
	};

	const handleCreateFile = () => {
		setCreatingItem({ type: 'file', name: 'New File.txt' });
	};

	const handleCreateFolder = () => {
		setCreatingItem({ type: 'folder', name: 'New Folder' });
	};

	const saveNewItem = () => {
		const name = creatingItem.name.trim();
		if (name && creatingItem.type) {
			if (creatingItem.type === 'file') {
				onCreateFile(name);
			} else {
				onCreateDirectory(name);
			}
			setCreatingItem({ type: null, name: '' });
		}
	};

	const cancelNewItem = () => {
		setCreatingItem({ type: null, name: '' });
	};

	const handleSelectItem = (file: FileEntry) => {
		setSelectedFile(file);
		setSelectedItem(file.path);
	};

	const handleToggleExpand = async (file: FileEntry) => {
		if (!file.is_dir) return;

		const isCurrentlyExpanded = !!expandedFolders[file.path];

		setExpandedFolders((prev) => ({
			...prev,
			[file.path]: !isCurrentlyExpanded
		}));

		if (!isCurrentlyExpanded && !expandedContents[file.path] && !isLoadingExpanded[file.path]) {
			try {
				setIsLoadingExpanded((prev) => ({ ...prev, [file.path]: true }));

				const entries = await invoke<FileEntry[]>('read_directory', {
					path: file.path,
					showHidden
				});

				setExpandedContents((prev) => ({
					...prev,
					[file.path]: entries
				}));
			} catch (error) {
				console.error(`Failed to load contents for ${file.path}:`, error);
			} finally {
				setIsLoadingExpanded((prev) => ({ ...prev, [file.path]: false }));
			}
		}
	};

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useEffect(() => {
		setSelectedFile(null);
		setSelectedItem(null);
	}, [currentPath]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const cmdOrCtrl = isMacOS ? event.metaKey : event.ctrlKey;

			if (event.key === 'Escape') {
				setSelectedFile(null);
				setSelectedItem(null);
			}

			if (selectedItem && selectedFile) {
				if ((isMacOS && cmdOrCtrl && event.key === 'Backspace') || (!isMacOS && event.key === 'Delete')) {
					event.preventDefault();
					onDeleteFile(selectedItem);
				}

				if (event.key === 'ArrowRight' && selectedFile.is_dir) {
					if (!expandedFolders[selectedItem]) {
						event.preventDefault();
						handleToggleExpand(selectedFile);
					}
				}

				if (event.key === 'ArrowLeft' && selectedFile.is_dir) {
					if (expandedFolders[selectedItem]) {
						event.preventDefault();
						handleToggleExpand(selectedFile);
					}
				}
			}

			if (cmdOrCtrl) {
				switch (event.key.toLowerCase()) {
					case 'o':
						if (selectedFile) {
							if (event.shiftKey) {
								event.preventDefault();
								onOpenFile(selectedFile);
							} else {
								event.preventDefault();
								onOpenFile(selectedFile);
							}
						}
						break;

					case 'c':
						if (selectedItem) {
							event.preventDefault();
							onCopyFile(selectedItem);
						}
						break;

					case 'x':
						if (selectedItem) {
							event.preventDefault();
							onCutFile(selectedItem);
						}
						break;

					case 'v':
						if (canPaste) {
							event.preventDefault();
							onPasteFiles();
						}
						break;

					case 'r':
						if (selectedFile) {
							event.preventDefault();
							startRenaming(selectedFile);
						}
						break;

					case 'n':
						if (event.shiftKey) {
							event.preventDefault();
							handleCreateFolder();
						} else {
							event.preventDefault();
							handleCreateFile();
						}
						break;

					case '=':
						if (cmdOrCtrl) {
							event.preventDefault();
							increaseZoom();
						}
						break;

					case '-':
						if (cmdOrCtrl) {
							event.preventDefault();
							decreaseZoom();
						}
						break;

					case '0':
						if (cmdOrCtrl) {
							event.preventDefault();
							resetZoom();
						}
						break;
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectedItem, selectedFile, files, canPaste, isMacOS, expandedFolders]);

	useEffect(() => {
		if (newlyCreatedPath && files.length > 0) {
			const fileToSelect = files.find((file) => file.path === newlyCreatedPath);
			if (fileToSelect) {
				setSelectedItem(fileToSelect.path);
				setSelectedFile(fileToSelect);

				setTimeout(() => {
					const fileElement = fileItemRefs.current.get(fileToSelect.path);
					const container = fileListContainerRef.current;

					if (fileElement && container) {
						const elementRect = fileElement.getBoundingClientRect();
						const containerRect = container.getBoundingClientRect();

						const offset = elementRect.top + container.scrollTop - containerRect.top - (containerRect.height - elementRect.height) / 2;

						container.scrollTop = offset;
					}
				}, 50);

				if (clearNewlyCreatedPath) {
					clearNewlyCreatedPath();
				}
			}
		}
	}, [files, newlyCreatedPath, clearNewlyCreatedPath]);

	useEffect(() => {
		if (contextMenu.visible) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [contextMenu.visible]);

	const sortedFiles = getSortedFiles();

	const renderFiles = () => {
		let rowIndex = 0;

		if (sortedFiles.length === 0 && !creatingItem.type) {
			return <div className="flex justify-center items-center h-40 text-stone-500 dark:text-stone-400">This folder is empty</div>;
		}

		const result: JSX.Element[] = [];

		const renderFileWithChildren = (file: FileEntry, depth: number = 0) => {
			const isExpanded = file.is_dir && expandedFolders[file.path];
			const isExpandable = file.is_dir && !(isMacOS && file.name.endsWith('.app'));
			const isAlternate = rowIndex % 2 === 1;

			const fileElement = (
				<div
					key={file.path}
					ref={(el) => {
						if (el) fileItemRefs.current.set(file.path, el);
						else fileItemRefs.current.delete(file.path);
					}}>
					<FileItem
						file={file}
						onOpen={onOpenFile}
						onSelect={handleSelectItem}
						onDelete={onDeleteFile}
						onRename={startRenaming}
						onContextMenu={handleFileContextMenu}
						isRenaming={renamingFile === file.path}
						isSelected={selectedItem === file.path}
						newName={newFileName}
						setNewName={setNewFileName}
						onSaveRename={saveRename}
						onCancelRename={cancelRename}
						zoomLevel={zoomLevel}
						iconSize={getScaledIconSize(16)}
						isExpanded={isExpanded}
						onToggleExpand={handleToggleExpand}
						depth={depth}
						isExpandable={isExpandable}
						isAlternate={isAlternate}
					/>
				</div>
			);

			result.push(fileElement);
			rowIndex++;

			if (isExpanded) {
				const children = expandedContents[file.path];

				if (children && children.length > 0) {
					const sortedChildren = getSortedExpandedContents(children);
					sortedChildren.forEach((child) => {
						renderFileWithChildren(child, depth + 1);
					});
				}
			}
		};

		sortedFiles.forEach((file) => {
			renderFileWithChildren(file);
		});

		return result;
	};

	const getScaledIconSize = (baseSize: number) => Math.round(baseSize * zoomLevel);

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 flex p-1 mb-0.5 bg-stone-100 dark:bg-stone-800 font-bold border-b-[1px] border-stone-400 dark:border-stone-700 cursor-default text-stone-700 dark:text-stone-400 text-xs">
				<div className="w-11"></div>
				<div className="flex-1 py-1" onClick={() => toggleSort('name')}>
					Name{getSortIndicator('name')}
				</div>
				<div className="mr-4 hidden md:block px-2 py-1" onClick={() => toggleSort('date')}>
					Modified{getSortIndicator('date')}
				</div>
				<div className="w-20 text-right mr-4 px-2 py-1" onClick={() => toggleSort('size')}>
					Size{getSortIndicator('size')}
				</div>
			</div>
			<div
				ref={fileListContainerRef}
				className="flex-1 overflow-auto relative pb-2"
				onContextMenu={handleBackgroundContextMenu}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setSelectedItem(null);
						setSelectedFile(null);
					}
				}}
				style={{ overflowY: contextMenu.visible ? 'hidden' : 'auto' }}>
				{creatingItem.type && (
					<div
						className={`cursor-default flex items-center border-b border-stone-300 dark:border-stone-700/50 bg-blue-100 dark:bg-[#0070FF]/20`}
						style={{
							padding: `${Math.max(2.5, Math.round(2.5 * zoomLevel))}px 1.25rem`
						}}>
						<div className="w-2"></div>

						<div style={{ marginRight: `${zoomLevel / 2}rem` }}>
							{creatingItem.type === 'folder' ? (
								<Folder size={getScaledIconSize(18)} fill="#57CBFC" strokeWidth={0} />
							) : (
								<FileText size={getScaledIconSize(18)} fill="#F3F3F3" strokeWidth={0} />
							)}
						</div>

						<div className="flex flex-1 items-center">
							<input
								type="text"
								value={creatingItem.name}
								onChange={(e) => setCreatingItem({ ...creatingItem, name: e.target.value })}
								className="px-1 bg-blue-100/80 border-0 rounded outline-none dark:bg-blue-900/40 dark:text-white ring-blue-400 ring-3 ring-inset"
								style={{
									fontSize: `${Math.max(0.75, 0.75 * zoomLevel)}rem`,
									minWidth: `${creatingItem.name.length}ch`,
									width: `${Math.max(creatingItem.name.length * 0.7, 10 * 0.7)}ch`,
									maxWidth: 'calc(100% - 120px)'
								}}
								autoFocus
								onBlur={saveNewItem}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => {
									if (e.key === 'Enter') saveNewItem();
									if (e.key === 'Escape') cancelNewItem();
								}}
							/>
						</div>

						<div style={{ fontSize: `${Math.max(0.75, 0.75 * zoomLevel)}rem` }} className="text-stone-500 text-xs mr-4 hidden md:block">
							--
						</div>

						<div style={{ fontSize: `${Math.max(0.75, 0.75 * zoomLevel)}rem` }} className="text-stone-500 text-xs w-20 text-right">
							--
						</div>
					</div>
				)}

				{renderFiles()}

				{contextMenu.visible && (
					<ContextMenu
						x={contextMenu.x}
						y={contextMenu.y}
						file={contextMenu.file}
						location={contextMenu.location}
						onClose={closeContextMenu}
						onOpen={onOpenFile}
						onDelete={onDeleteFile}
						onRename={startRenaming}
						onCopy={onCopyFile}
						onCut={onCutFile}
						onPaste={onPasteFiles}
						refreshDirectory={refreshDirectory}
						onCreateFile={handleCreateFile}
						onCreateFolder={handleCreateFolder}
						canPaste={canPaste}
						showHidden={showHidden}
						onToggleHidden={onToggleHidden}
						restoreFromTrash={restoreFromTrash}
						permanentlyDelete={permanentlyDelete}
					/>
				)}
			</div>

			<StatusBar files={files} currentPath={currentPath} onNavigate={onNavigate} />
		</div>
	);
}
