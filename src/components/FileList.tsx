import { useState, useEffect, useRef, MouseEvent } from 'react';
import { ContextMenuLocation } from '@/types';
import { platform } from '@tauri-apps/plugin-os';
import { load } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

import { FileItem } from '@/components/FileItem';
import { ContextMenu } from '@/components/ContextMenu';
import { StatusBar } from '@/components/StatusBar';
import { FileEntry } from '@/hooks/useFileSystem';
import { AlternatingBackgroundRows } from '@/components/Background';
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

	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
	const [initialScrollTop, setInitialScrollTop] = useState(0);
	const dragSelectionRef = useRef<HTMLDivElement>(null);
	const filePositionsRef = useRef<Map<string, DOMRect>>(new Map());
	const [isCtrlDrag, setIsCtrlDrag] = useState(false);

	const [zoomLevel, setZoomLevel] = useState<number>(1.05);
	const [renamingFile, setRenamingFile] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState<string>('');

	const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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

	const handleSelectItem = (file: FileEntry, event: MouseEvent) => {
		const index = sortedFiles.findIndex((f) => f.path === file.path);

		if (event.shiftKey && lastSelectedIndex !== null) {
			const startIdx = Math.min(lastSelectedIndex, index);
			const endIdx = Math.max(lastSelectedIndex, index);
			const filesToSelect = sortedFiles.slice(startIdx, endIdx + 1);

			setSelectedFiles((prevSelected) => {
				const newSelection = [...prevSelected];
				filesToSelect.forEach((file) => {
					if (!newSelection.some((f) => f.path === file.path)) {
						newSelection.push(file);
					}
				});
				return newSelection;
			});

			setSelectedItems((prevSelected) => {
				const newSelection = [...prevSelected];
				filesToSelect.forEach((file) => {
					if (!newSelection.includes(file.path)) {
						newSelection.push(file.path);
					}
				});
				return newSelection;
			});
		} else if (isMacOS ? event.metaKey : event.ctrlKey) {
			if (selectedItems.includes(file.path)) {
				setSelectedFiles(selectedFiles.filter((f) => f.path !== file.path));
				setSelectedItems(selectedItems.filter((path) => path !== file.path));
			} else {
				setSelectedFiles([...selectedFiles, file]);
				setSelectedItems([...selectedItems, file.path]);
			}
		} else {
			setSelectedFiles([file]);
			setSelectedItems([file.path]);
		}

		setLastSelectedIndex(index);
	};

	const handleFileContextMenu = (event: MouseEvent, file: FileEntry) => {
		event.preventDefault();
		event.stopPropagation();

		if (!selectedItems.includes(file.path)) {
			setSelectedFiles([file]);
			setSelectedItems([file.path]);
		}

		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			file: file,
			location: ContextMenuLocation.FILE_LIST,
			selectionCount: selectedItems.length
		});
	};

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

	const handleDeleteFiles = () => {
		selectedItems.forEach((path) => onDeleteFile(path));
	};

	const handleCopyFiles = () => {
		selectedItems.forEach((path) => onCopyFile(path));
	};

	const handleCutFiles = () => {
		selectedItems.forEach((path) => onCutFile(path));
	};

	const handleBackgroundClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			setSelectedFiles([]);
			setSelectedItems([]);
			setLastSelectedIndex(null);
		}
	};

	const handleCreateFile = () => {
		setSelectedFiles([]);
		setSelectedItems([]);
		setLastSelectedIndex(null);
		setCreatingItem({ type: 'file', name: 'New File.txt' });
	};

	const handleCreateFolder = () => {
		setSelectedFiles([]);
		setSelectedItems([]);
		setLastSelectedIndex(null);
		setCreatingItem({ type: 'folder', name: 'New Folder' });
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
		if (selectedItems.length === 1) {
			setRenamingFile(file.path);
			setNewFileName(file.name);
		}
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
		setSelectedFiles([]);
		setSelectedItems([]);
		setLastSelectedIndex(null);
	}, [currentPath]);

	useEffect(() => {
		if (newlyCreatedPath && files.length > 0) {
			const fileToSelect = files.find((file) => file.path === newlyCreatedPath);
			if (fileToSelect) {
				setSelectedFiles([fileToSelect]);
				setSelectedItems([fileToSelect.path]);
				setLastSelectedIndex(files.findIndex((file) => file.path === fileToSelect.path));

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
		const result: JSX.Element[] = [];
		let rowIndex = 0;

		const renderFileWithChildren = (file: FileEntry, depth: number = 0) => {
			const isExpanded = file.is_dir && expandedFolders[file.path];
			const isExpandable = file.is_dir && !(isMacOS && file.name.endsWith('.app'));
			const isAlternate = rowIndex % 2 === 1;
			const isSelected = selectedItems.includes(file.path);

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
						onSelect={(file) => handleSelectItem(file, window.event as MouseEvent)}
						onDelete={onDeleteFile}
						onRename={startRenaming}
						onContextMenu={handleFileContextMenu}
						isRenaming={renamingFile === file.path}
						isSelected={isSelected}
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

	const handleMouseDown = (e: MouseEvent) => {
		if (e.button !== 0 || e.target !== e.currentTarget) return;

		setIsCtrlDrag(isMacOS ? e.metaKey : e.ctrlKey);

		const container = fileListContainerRef.current;
		if (!container) return;

		setInitialScrollTop(container.scrollTop);
		captureFilePositions();
		setIsDragging(true);

		const rect = container.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top + container.scrollTop;
		setDragStart({ x, y });
		setDragCurrent({ x, y });

		e.preventDefault();
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !fileListContainerRef.current) return;

		const container = fileListContainerRef.current;
		const rect = container.getBoundingClientRect();

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top + container.scrollTop;
		setDragCurrent({ x, y });

		const SCROLL_MARGIN = 50;
		const SCROLL_SPEED = 15;

		if (e.clientY - rect.top < SCROLL_MARGIN) {
			container.scrollTop = Math.max(0, container.scrollTop - SCROLL_SPEED);
		} else if (rect.bottom - e.clientY < SCROLL_MARGIN) {
			container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + SCROLL_SPEED);
		}

		updateDragSelection();
	};

	const handleMouseUp = () => {
		if (!isDragging) return;
		setIsDragging(false);
		updateDragSelection();
	};

	const captureFilePositions = () => {
		filePositionsRef.current.clear();
		files.forEach((file) => {
			const fileElement = fileItemRefs.current.get(file.path);
			if (fileElement) {
				filePositionsRef.current.set(file.path, fileElement.getBoundingClientRect());
			}
		});
	};

	const updateDragSelection = () => {
		if (!isDragging || !fileListContainerRef.current) return;

		const container = fileListContainerRef.current;
		const containerRect = container.getBoundingClientRect();

		const left = Math.min(dragStart.x, dragCurrent.x);
		const top = Math.min(dragStart.y, dragCurrent.y);
		const right = Math.max(dragStart.x, dragCurrent.x);
		const bottom = Math.max(dragStart.y, dragCurrent.y);

		const scrollDelta = container.scrollTop - initialScrollTop;
		const topWithScroll = top - scrollDelta;
		const bottomWithScroll = bottom - scrollDelta;

		const filesInSelection: FileEntry[] = [];
		const pathsInSelection: string[] = [];

		files.forEach((file) => {
			const fileRect = filePositionsRef.current.get(file.path);
			if (!fileRect) return;

			const fileTop = fileRect.top - containerRect.top;
			const fileBottom = fileRect.bottom - containerRect.top;

			const intersects =
				right >= fileRect.left - containerRect.left &&
				left <= fileRect.right - containerRect.left &&
				bottomWithScroll >= fileTop &&
				topWithScroll <= fileBottom;

			if (intersects) {
				filesInSelection.push(file);
				pathsInSelection.push(file.path);
			}
		});

		if (isCtrlDrag) {
			setSelectedFiles((prev) => {
				const currentPaths = prev.map((f) => f.path);
				const newFiles = [...prev];

				filesInSelection.forEach((file) => {
					if (!currentPaths.includes(file.path)) {
						newFiles.push(file);
					}
				});

				return newFiles;
			});

			setSelectedItems((prev) => {
				const newPaths = [...prev];

				pathsInSelection.forEach((path) => {
					if (!newPaths.includes(path)) {
						newPaths.push(path);
					}
				});

				return newPaths;
			});
		} else {
			console.log();
			setSelectedFiles(filesInSelection);
			setSelectedItems(pathsInSelection);
		}

		if (pathsInSelection.length > 0) {
			const lastIdx = files.findIndex((f) => f.path === pathsInSelection[pathsInSelection.length - 1]);
			if (lastIdx !== -1) {
				setLastSelectedIndex(lastIdx);
			}
		}
	};

	const getScaledIconSize = (baseSize: number) => Math.round(baseSize * zoomLevel);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const cmdOrCtrl = isMacOS ? event.metaKey : event.ctrlKey;

			if (event.key === 'Escape') {
				setSelectedFiles([]);
				setSelectedItems([]);
				setLastSelectedIndex(null);
			}

			if (selectedItems.length > 0) {
				if ((isMacOS && cmdOrCtrl && event.key === 'Backspace') || (!isMacOS && event.key === 'Delete')) {
					event.preventDefault();
					handleDeleteFiles();
				}

				if (selectedItems.length === 1 && selectedFiles.length === 1) {
					const selectedFile = selectedFiles[0];
					if (event.key === 'ArrowRight' && selectedFile.is_dir) {
						if (!expandedFolders[selectedItems[0]]) {
							event.preventDefault();
							handleToggleExpand(selectedFile);
						}
					}

					if (event.key === 'ArrowLeft' && selectedFile.is_dir) {
						if (expandedFolders[selectedItems[0]]) {
							event.preventDefault();
							handleToggleExpand(selectedFile);
						}
					}
				}
			}

			if (cmdOrCtrl) {
				switch (event.key.toLowerCase()) {
					case 'o':
						if (selectedFiles.length === 1) {
							event.preventDefault();
							onOpenFile(selectedFiles[0]);
						}
						break;

					case 'c':
						if (selectedItems.length > 0) {
							event.preventDefault();
							handleCopyFiles();
						}
						break;

					case 'x':
						if (selectedItems.length > 0) {
							event.preventDefault();
							handleCutFiles();
						}
						break;

					case 'v':
						if (canPaste) {
							event.preventDefault();
							onPasteFiles();
						}
						break;

					case 'r':
						if (selectedFiles.length === 1) {
							event.preventDefault();
							startRenaming(selectedFiles[0]);
						}
						break;

					case 'a':
						event.preventDefault();
						setSelectedFiles([...sortedFiles]);
						setSelectedItems(sortedFiles.map((file) => file.path));
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
	}, [selectedItems, selectedFiles, files, canPaste, isMacOS, expandedFolders, sortedFiles]);

	useEffect(() => {
		const container = fileListContainerRef.current;
		if (!container) return;

		const handleGlobalMouseMove = (e: MouseEvent) => {
			handleMouseMove(e);
		};

		const handleGlobalMouseUp = () => {
			handleMouseUp();
		};

		if (isDragging) {
			window.addEventListener('mousemove', handleGlobalMouseMove);
			window.addEventListener('mouseup', handleGlobalMouseUp);
		}

		return () => {
			window.removeEventListener('mousemove', handleGlobalMouseMove);
			window.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	}, [isDragging, dragStart, dragCurrent, initialScrollTop]);

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
				onMouseDown={handleMouseDown}
				onContextMenu={handleBackgroundContextMenu}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setSelectedFiles([]);
						setSelectedItems([]);
						setLastSelectedIndex(null);
					}
				}}
				style={{ overflowY: contextMenu.visible ? 'hidden' : 'auto' }}>
				{isDragging && (
					<div
						ref={dragSelectionRef}
						className="absolute border border-blue-500 bg-blue-500/20 z-10 pointer-events-none"
						style={{
							left: Math.min(dragStart.x, dragCurrent.x),
							top: Math.min(dragStart.y, dragCurrent.y) - fileListContainerRef.current!.scrollTop + initialScrollTop,
							width: Math.abs(dragCurrent.x - dragStart.x),
							height: Math.abs(dragCurrent.y - dragStart.y)
						}}
					/>
				)}

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

				<AlternatingBackgroundRows
					startIndex={renderFiles().length + (creatingItem.type ? 1 : 0)}
					containerRef={fileListContainerRef}
					zoomLevel={zoomLevel}
				/>

				{contextMenu.visible && (
					<ContextMenu
						x={contextMenu.x}
						y={contextMenu.y}
						file={contextMenu.file}
						location={contextMenu.location}
						onClose={closeContextMenu}
						onOpen={onOpenFile}
						onDelete={selectedItems.length > 1 ? handleDeleteFiles : onDeleteFile}
						onRename={startRenaming}
						onCopy={selectedItems.length > 1 ? handleCopyFiles : onCopyFile}
						onCut={selectedItems.length > 1 ? handleCutFiles : onCutFile}
						onPaste={onPasteFiles}
						refreshDirectory={refreshDirectory}
						onCreateFile={handleCreateFile}
						onCreateFolder={handleCreateFolder}
						canPaste={canPaste}
						showHidden={showHidden}
						onToggleHidden={onToggleHidden}
						restoreFromTrash={restoreFromTrash}
						permanentlyDelete={permanentlyDelete}
						selectionCount={selectedItems.length}
					/>
				)}
			</div>

			<StatusBar
				files={files}
				currentPath={currentPath}
				onNavigate={onNavigate}
				selectedCount={selectedItems.length}
				selectedSize={selectedFiles.reduce((total, file) => total + file.size, 0)}
			/>
		</div>
	);
}
