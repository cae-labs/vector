import { useState, useEffect, useRef, MouseEvent } from 'react';
import { ContextMenuLocation } from '@/types';
import { platform } from '@tauri-apps/plugin-os';

import { FileItem } from '@/components/FileItem';
import { ContextMenu } from '@/components/ContextMenu';
import { StatusBar } from '@/components/StatusBar';
import { FileEntry } from '@/hooks/useFileSystem';

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
	isLoading: boolean;
	showHidden: boolean;
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
	isLoading,
	showHidden,
	onToggleHidden,
	restoreFromTrash,
	permanentlyDelete,
	newlyCreatedPath,
	clearNewlyCreatedPath,
	onNavigate
}: FileListProps) {
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

	const [renamingFile, setRenamingFile] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState<string>('');

	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	const [creatingItem, setCreatingItem] = useState<{
		type: 'file' | 'folder' | null;
		name: string;
	}>({ type: null, name: '' });

	const handleFileContextMenu = (event: MouseEvent, file: FileEntry) => {
		event.preventDefault();
		event.stopPropagation();
		setSelectedItem(file.path);
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

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const cmdOrCtrl = isMacOS ? event.metaKey : event.ctrlKey;

			if (selectedItem) {
				if ((isMacOS && cmdOrCtrl && event.key === 'Backspace') || (!isMacOS && event.key === 'Delete')) {
					event.preventDefault();
					onDeleteFile(selectedItem);
				}
			}

			if (cmdOrCtrl) {
				switch (event.key.toLowerCase()) {
					case 'o':
						if (selectedFile) {
							if (event.shiftKey) {
								event.preventDefault();
								onOpenFile(selectedFile, true);
							} else {
								event.preventDefault();
								onOpenFile(selectedFile);
							}
						}
						break;
					case 'c':
						if (selectedItem) {
							event.preventDefault();
							const selectedFile = files.find((file) => file.path === selectedItem);
							if (selectedFile) onCopyFile(selectedFile.path);
						}
						break;
					case 'x':
						if (selectedItem) {
							event.preventDefault();
							const selectedFile = files.find((file) => file.path === selectedItem);
							if (selectedFile) onCutFile(selectedFile.path);
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
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectedItem, files, canPaste, isMacOS]);

	useEffect(() => {
		if (newlyCreatedPath && files.length > 0) {
			const fileToSelect = files.find((file) => file.path === newlyCreatedPath);
			if (fileToSelect) {
				setSelectedItem(fileToSelect.path);

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

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 flex p-1.5 bg-stone-100 dark:bg-stone-800 font-bold border-b border-stone-400 dark:border-stone-700 cursor-default text-stone-700 dark:text-stone-400 text-xs">
				<div className="w-11"></div>
				<div className="flex-1">Name</div>
				<div className="mr-4 hidden md:block">Modified</div>
				<div className="w-20 text-right mr-4">Size</div>
			</div>
			<div
				ref={fileListContainerRef}
				className="flex-1 overflow-auto relative"
				onContextMenu={handleBackgroundContextMenu}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setSelectedItem(null);
					}
				}}
				style={{ overflowY: contextMenu.visible ? 'hidden' : 'auto' }}>
				{creatingItem.type && (
					<div className="flex items-center p-2 border-b border-stone-300 bg-blue-50">
						<div className="mr-2 text-xl">{creatingItem.type === 'file' ? '📄' : '📁'}</div>
						<div className="flex flex-1 items-center">
							<input
								type="text"
								value={creatingItem.name}
								onChange={(e) => setCreatingItem({ ...creatingItem, name: e.target.value })}
								className="flex-1 p-1 border rounded"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === 'Enter') saveNewItem();
									if (e.key === 'Escape') cancelNewItem();
								}}
							/>
						</div>
					</div>
				)}

				{files.length === 0 && !creatingItem.type ? (
					<div className="flex justify-center items-center h-40 text-stone-500">This folder is empty</div>
				) : (
					files.map((file) => (
						<div
							key={file.path}
							ref={(el) => {
								if (el) fileItemRefs.current.set(file.path, el);
								else fileItemRefs.current.delete(file.path);
							}}>
							<FileItem
								key={file.path}
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
							/>
						</div>
					))
				)}

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
