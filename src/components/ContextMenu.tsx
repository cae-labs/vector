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

	const endsWith = (str: string, suffix: string): boolean => {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};

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
		<div
			ref={menuRef}
			className="fixed bg-stone-100/40 dark:bg-stone-900/80 backdrop-blur-lg shadow-lg rounded-md border-1 border-stone-200 dark:border-stone-500/50 dark:ring-1 dark:ring-black z-50 text-sm"
			style={{ minWidth: '180px' }}>
			<ul className="py-1">
				{location === ContextMenuLocation.FILE_LIST && file && (
					<>
						{restoreFromTrash ? (
							<>
								<li className="mx-1.5 border-b pt-0.5 pb-1.5 border-stone-300 dark:border-stone-600">
									<button
										onClick={() => {
											restoreFromTrash(file.path);
											onClose();
										}}
										className="w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										Restore
									</button>
								</li>
								<li className="mx-1.5 pt-1.5 pb-0.5">
									<button
										onClick={() => {
											permanentlyDelete?.(file.path);
											onClose();
										}}
										className="w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										Delete Permanently
									</button>
								</li>
							</>
						) : (
							<>
								<li className="mx-1.5 border-b pt-0.5 pb-1.5 border-stone-300 dark:border-stone-600">
									<button
										onClick={() => {
											onOpen(file);
											onClose();
										}}
										className="w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										{endsWith(file.path, '.app') ? 'Open' : file.is_dir ? 'Open Folder' : 'Open'}
										<KeybindBadge>{isMacOS ? '⌘ O' : 'Ctrl+O'}</KeybindBadge>
									</button>

									{endsWith(file.path, '.app') && (
										<li className="pt-1.5">
											<button
												onClick={() => {
													onOpen(file, true);
													onClose();
												}}
												className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
												Show Package Contents <KeybindBadge>{isMacOS ? '⌘ ⇧ o' : 'Ctrl+⇧+O'}</KeybindBadge>
											</button>
										</li>
									)}
								</li>
								<li className="mx-1.5 mt-1 border-b pt-0.5 pb-1.5 border-stone-300 dark:border-stone-600">
									<button
										onClick={() => {
											onDelete(file.path);
											onClose();
										}}
										className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										<span>Move to Trash</span>
										<KeybindBadge>{isMacOS ? '⌘ ⌫' : 'Delete'}</KeybindBadge>
									</button>
								</li>
								<li className="mx-1.5 pt-1.5">
									<button
										onClick={() => {
											onCopy(file.path);
											onClose();
										}}
										className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										Copy <KeybindBadge>{isMacOS ? '⌘ C' : 'Ctrl+C'}</KeybindBadge>
									</button>
								</li>
								<li className="mx-1.5 mt-1">
									<button
										onClick={() => {
											onCut(file.path);
											onClose();
										}}
										className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										Cut <KeybindBadge>{isMacOS ? '⌘ X' : 'Ctrl+X'}</KeybindBadge>
									</button>
								</li>
								<li className="mx-1.5 mt-1 pb-1.5">
									<button
										onClick={() => {
											onRename(file);
											onClose();
										}}
										className="w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
										Rename <KeybindBadge>{isMacOS ? '⌘ R' : 'Ctrl+R'}</KeybindBadge>
									</button>
								</li>
							</>
						)}
					</>
				)}

				{location === ContextMenuLocation.SIDEBAR && file && onPinUnpinFolder && (
					<li className="mx-1.5 pb-1.5 pt-0.5">
						<button
							onClick={() => {
								onPinUnpinFolder(file.path, 'unpin');
								onClose();
							}}
							className="w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
							Unpin from sidebar
						</button>
					</li>
				)}

				{(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE) && !restoreFromTrash && (
					<>
						<li
							className={
								file && location === ContextMenuLocation.FILE_LIST
									? 'pt-1.5 mx-1.5 border-t pb-1.5 border-stone-300 dark:border-stone-600'
									: 'pb-0.5 mx-1.5'
							}>
							<button
								onClick={() => {
									onCreateFile();
									onClose();
								}}
								className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
								New File <KeybindBadge>{isMacOS ? '⌘ N' : 'Ctrl+N'}</KeybindBadge>
							</button>
						</li>
						<li className="mx-1.5 mb-1.5">
							<button
								onClick={() => {
									onCreateFolder();
									onClose();
								}}
								className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
								New Folder <KeybindBadge>{isMacOS ? '⌘ ⇧ N' : 'Ctrl+⇧+N'}</KeybindBadge>
							</button>
						</li>
					</>
				)}

				{location !== ContextMenuLocation.SIDEBAR && canPaste && !restoreFromTrash && (
					<li className="mx-1.5 py-1.5 mt-1 border-t border-stone-300 dark:border-stone-600">
						<button
							onClick={() => {
								onPaste();
								onClose();
							}}
							className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
							Paste <KeybindBadge>{isMacOS ? '⌘ V' : 'Ctrl+V'}</KeybindBadge>
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
								: 'mx-1.5 border-t pb-0.5 pt-1.5 border-stone-300 dark:border-stone-600'
						}>
						<button
							onClick={() => {
								onToggleHidden();
								onClose();
							}}
							className="group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-white flex justify-between items-center">
							{showHidden ? 'Hide hidden files' : 'Show hidden files'} <KeybindBadge>{isMacOS ? '⌘ H' : 'Ctrl+H'}</KeybindBadge>
						</button>
					</li>
				)}
			</ul>
		</div>
	);
}
