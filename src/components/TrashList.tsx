import { useState, useEffect, MouseEvent } from 'react';
import { ContextMenuLocation } from '@/types';

import { FileItem } from '@/components/FileItem';
import { ContextMenu } from '@/components/ContextMenu';
import { StatusBar } from '@/components/StatusBar';
import { FileEntry } from '@/hooks/useFileSystem';

interface TrashListProps {
	files: FileEntry[];
	restoreFromTrash: (path: string) => void;
	permanentlyDelete: (path: string) => void;
	showHidden: boolean;
	onToggleHidden: () => void;
}

export function TrashList({ files, restoreFromTrash, permanentlyDelete, showHidden, onToggleHidden }: TrashListProps) {
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
		location: ContextMenuLocation.FILE_LIST
	});

	const [selectedItem, setSelectedItem] = useState<string | null>(null);

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

	const closeContextMenu = () => {
		setContextMenu({ ...contextMenu, visible: false });
	};

	const handleSelectItem = (file: FileEntry) => {
		setSelectedItem(file.path);
	};

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
			<div className="sticky top-0 flex p-1.5 mb-0.5 bg-stone-100 dark:bg-stone-800 font-bold border-b border-stone-400 dark:border-stone-700 cursor-default text-stone-700 dark:text-stone-400 text-xs">
				<div className="w-11"></div>
				<div className="flex-1">Name</div>
				<div className="mr-4 hidden md:block">Modified</div>
				<div className="w-20 text-right mr-4">Size</div>
			</div>
			<div
				className="flex-1 overflow-auto relative"
				onClick={(e) => {
					if (e.target === e.currentTarget) {
						setSelectedItem(null);
					}
				}}
				style={{ overflowY: contextMenu.visible ? 'hidden' : 'auto' }}>
				{files.length === 0 ? (
					<div className="flex justify-center items-center h-40 text-stone-500">Trash is empty</div>
				) : (
					files.map((file) => (
						<FileItem
							key={file.path}
							file={file}
							onOpen={() => {}}
							onSelect={handleSelectItem}
							onDelete={() => permanentlyDelete(file.path)}
							onRename={() => {}}
							onContextMenu={handleFileContextMenu}
							isRenaming={false}
							isSelected={selectedItem === file.path}
							newName=""
							setNewName={() => {}}
							onSaveRename={() => {}}
							onCancelRename={() => {}}
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
						onOpen={() => {}}
						onDelete={() => permanentlyDelete(contextMenu.file?.path || '')}
						onRename={() => {}}
						onCopy={() => {}}
						onCut={() => {}}
						onPaste={() => {}}
						onCreateFile={() => {}}
						onCreateFolder={() => {}}
						canPaste={false}
						showHidden={showHidden}
						onToggleHidden={onToggleHidden}
						restoreFromTrash={restoreFromTrash}
						permanentlyDelete={permanentlyDelete}
					/>
				)}
			</div>

			<StatusBar files={files} currentPath={'internal:trash'} />
		</div>
	);
}
