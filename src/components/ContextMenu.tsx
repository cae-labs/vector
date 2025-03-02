import { useEffect, useState, useRef } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { ContextMenuLocation } from '@/types';
import { KeybindBadge } from '@/components/Badge';
import { platform } from '@tauri-apps/plugin-os';

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
	restoreFromTrash?: (path: string) => void;
	permanentlyDelete?: (path: string) => void;
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
	onToggleHidden,
	restoreFromTrash,
	permanentlyDelete
}: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [isMacOS, setIsMacOS] = useState(false);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

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
		<div ref={menuRef} className="fixed bg-white shadow-lg rounded border border-stone-200 z-50" style={{ minWidth: '180px' }}>
			<ul className="py-1">
				{location === ContextMenuLocation.FILE_LIST && file && (
					<>
						{restoreFromTrash ? (
							<>
								<li>
									<button
										onClick={() => {
											restoreFromTrash(file.path);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100 text-blue-600">
										Restore
									</button>
								</li>
								<li>
									<button
										onClick={() => {
											permanentlyDelete?.(file.path);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100 text-red-600">
										Delete Permanently
									</button>
								</li>
							</>
						) : (
							<>
								<li>
									<button
										onClick={() => {
											onCopy(file.path);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100 flex justify-between items-center">
										Copy <KeybindBadge>{isMacOS ? '⌘C' : 'Ctrl+C'}</KeybindBadge>
									</button>
								</li>
								<li>
									<button
										onClick={() => {
											onCut(file.path);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100 flex justify-between items-center">
										Cut <KeybindBadge>{isMacOS ? '⌘X' : 'Ctrl+X'}</KeybindBadge>
									</button>
								</li>
								<li className="border-t border-stone-200">
									<button
										onClick={() => {
											onRename(file);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100">
										Rename
									</button>
								</li>
								<li>
									<button
										onClick={() => {
											onDelete(file.path);
											onClose();
										}}
										className="w-full text-left px-4 py-2 hover:bg-stone-100 text-red-600 flex justify-between items-center">
										<span>Move to Trash</span>
										<KeybindBadge>{isMacOS ? '⌘⌫' : 'Delete'}</KeybindBadge>
									</button>
								</li>
							</>
						)}
					</>
				)}

				{location === ContextMenuLocation.SIDEBAR && file && onPinUnpinFolder && (
					<li>
						<button
							onClick={() => {
								onPinUnpinFolder(file.path, 'unpin');
								onClose();
							}}
							className="w-full text-left px-4 py-2 hover:bg-stone-100">
							Unpin from sidebar
						</button>
					</li>
				)}

				{(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE) && !restoreFromTrash && (
					<>
						<li className={file && location === ContextMenuLocation.FILE_LIST ? 'border-t border-stone-200' : ''}>
							<button
								onClick={() => {
									onCreateFile();
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-stone-100 flex justify-between items-center">
								New File <KeybindBadge>{isMacOS ? '⌘N' : 'Ctrl+N'}</KeybindBadge>
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									onCreateFolder();
									onClose();
								}}
								className="w-full text-left px-4 py-2 hover:bg-stone-100 flex justify-between items-center">
								New Folder <KeybindBadge>{isMacOS ? '⌘⇧N' : 'Ctrl+⇧+N'}</KeybindBadge>
							</button>
						</li>
					</>
				)}

				{location !== ContextMenuLocation.SIDEBAR && canPaste && !restoreFromTrash && (
					<li className="border-t border-stone-200">
						<button
							onClick={() => {
								onPaste();
								onClose();
							}}
							className="w-full text-left px-4 py-2 hover:bg-stone-100">
							Paste <KeybindBadge>{isMacOS ? '⌘V' : 'Ctrl+V'}</KeybindBadge>
						</button>
					</li>
				)}

				{!restoreFromTrash && (
					<li
						className={
							(location === ContextMenuLocation.SIDEBAR && !file) ||
							(location !== ContextMenuLocation.SIDEBAR &&
								!canPaste &&
								!(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE))
								? ''
								: 'border-t border-stone-200'
						}>
						<button
							onClick={() => {
								onToggleHidden();
								onClose();
							}}
							className="w-full text-left px-4 py-2 hover:bg-stone-100 flex justify-between items-center">
							{showHidden ? 'Hide hidden files' : 'Show hidden files'} <KeybindBadge>{isMacOS ? '⌘+H' : 'Ctrl+H'}</KeybindBadge>
						</button>
					</li>
				)}
			</ul>
		</div>
	);
}
