import React, { useState } from 'react';
import { FileItem } from './FileItem';
import { ContextMenu } from './ContextMenu';
import { FileEntry } from '../hooks/useFileSystem';
import { ContextMenuLocation } from '../types';

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
	onToggleHidden
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

	const [renamingFile, setRenamingFile] = useState<string | null>(null);
	const [newFileName, setNewFileName] = useState<string>('');
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	const [creatingItem, setCreatingItem] = useState<{
		type: 'file' | 'folder' | null;
		name: string;
	}>({ type: null, name: '' });

	const handleFileContextMenu = (event: React.MouseEvent, file: FileEntry) => {
		event.preventDefault();
		event.stopPropagation(); // prevent the background context menu from triggering
		setContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			file: file,
			location: ContextMenuLocation.FILE_LIST
		});
	};

	const handleBackgroundContextMenu = (event: React.MouseEvent) => {
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
		setSelectedItem(file.path);
	};

	const handleOpenItem = (file: FileEntry) => {
		onOpenFile(file);
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-full">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	return (
		<>
			<div className="sticky top-0 flex p-2 bg-gray-200 font-bold border-b cursor-default">
				<div className="w-8"></div>
				<div className="flex-1">Name</div>
				<div className="text-gray-700 mr-4 hidden md:block">Modified</div>
				<div className="w-20 text-right">Size</div>
			</div>
			<div
				className="flex-1 overflow-auto relative"
				onContextMenu={handleBackgroundContextMenu}
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setSelectedItem(null);
					}
				}}>
				{creatingItem.type && (
					<div className="flex items-center p-2 border-b bg-blue-50">
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
							<button onClick={saveNewItem} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
								Create
							</button>
							<button onClick={cancelNewItem} className="ml-2 px-2 py-1 bg-gray-500 text-white rounded text-xs">
								Cancel
							</button>
						</div>
					</div>
				)}

				{files.length === 0 && !creatingItem.type ? (
					<div className="flex justify-center items-center h-40 text-gray-500">This folder is empty</div>
				) : (
					files.map((file) => (
						<FileItem
							key={file.path}
							file={file}
							onOpen={handleOpenItem}
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
					/>
				)}
			</div>
		</>
	);
}
