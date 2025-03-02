import { useEffect, useRef } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { ContextMenuLocation } from '@/types';

interface ContextMenuProps {
	x: number;
	y: number;
	file: FileEntry | null;
	location: ContextMenuLocation;
	onClose: () => void;
	onOpen: (file: FileEntry) => void;
	onDelete: (path: string) => void;
	onRename: (file: FileEntry) => void;
	onCopy: (path: string) => void;
	onCut: (path: string) => void;
	onPaste: () => void;
	onCreateFile: () => void;
	onCreateFolder: () => void;
	onPinUnpinFolder?: (path: string, action: 'pin' | 'unpin') => void;
	canPaste: boolean;
	showHidden: boolean;
	onToggleHidden: () => void;
}

export function ContextMenu({
	x,
	y,
	file,
	location,
	onClose,
	onOpen,
	onDelete,
	onRename,
	onCopy,
	onCut,
	onPaste,
	onCreateFile,
	onCreateFolder,
	onPinUnpinFolder,
	canPaste,
	showHidden,
	onToggleHidden
}: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onClose]);

	// Adjust position if menu would go off screen
	useEffect(() => {
		if (!menuRef.current) return;

		const menuRect = menuRef.current.getBoundingClientRect();
		const rightOverflow = x + menuRect.width > window.innerWidth;
		const bottomOverflow = y + menuRect.height > window.innerHeight;

		if (rightOverflow) {
			menuRef.current.style.left = `${window.innerWidth - menuRect.width}px`;
		} else {
			menuRef.current.style.left = `${x}px`;
		}

		if (bottomOverflow) {
			menuRef.current.style.top = `${window.innerHeight - menuRect.height}px`;
		} else {
			menuRef.current.style.top = `${y}px`;
		}
	}, [x, y]);

	return (
		<div ref={menuRef} className="fixed bg-white shadow-lg rounded border border-gray-200 z-50" style={{ minWidth: '180px' }}>
			<ul className="py-1">
				{location === ContextMenuLocation.FILE_LIST && file && (
					<>
						<li>
							<button
								onClick={() => {
									onOpen(file);
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								{file.is_dir ? 'Open' : 'Open with default app'}
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									onCopy(file.path);
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								Copy
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									onCut(file.path);
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								Cut
							</button>
						</li>
						<li className="border-t border-gray-200">
							<button
								onClick={() => {
									onRename(file);
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								Rename
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									onDelete(file.path);
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
								Delete
							</button>
						</li>
					</>
				)}

				{location === ContextMenuLocation.SIDEBAR && file && onPinUnpinFolder && (
					<li>
						<button
							onClick={() => {
								onPinUnpinFolder(file.path, 'unpin');
								onClose();
							}}
							className="w-full text-left px-4 py-2 hover:bg-gray-100">
							Unpin from sidebar
						</button>
					</li>
				)}

				{(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE) && (
					<>
						<li className={file && location === ContextMenuLocation.FILE_LIST ? 'border-t border-gray-200' : ''}>
							<button
								onClick={() => {
									onCreateFile();
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								New File
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									onCreateFolder();
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-gray-100">
								New Folder
							</button>
						</li>
					</>
				)}

				{location !== ContextMenuLocation.SIDEBAR && canPaste && (
					<li className="border-t border-gray-200">
						<button
							onClick={() => {
								onPaste();
								onClose();
							}}
							className="w-full text-left px-4 py-2 hover:bg-gray-100">
							Paste
						</button>
					</li>
				)}

				<li
					className={
						(location === ContextMenuLocation.SIDEBAR && !file) ||
						(location !== ContextMenuLocation.SIDEBAR &&
							!canPaste &&
							!(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE))
							? ''
							: 'border-t border-gray-200'
					}>
					<button
						onClick={() => {
							onToggleHidden();
							onClose();
						}}
						className="w-full text-left px-4 py-2 hover:bg-gray-100">
						{showHidden ? 'Hide hidden files' : 'Show hidden files'}
					</button>
				</li>
			</ul>
		</div>
	);
}
