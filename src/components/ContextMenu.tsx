import { useEffect, useState, useRef } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { ContextMenuLocation } from '@/types';
import { KeybindBadge } from '@/components/Badge';
import { platform } from '@tauri-apps/plugin-os';
import { Delete } from 'lucide-react';

interface ContextMenuProps {
	x: number;
	y: number;
	file: FileEntry | null;
	location: ContextMenuLocation;
	onClose: () => void;
	onOpen: (file: FileEntry) => void;
	onDelete: ((path: string) => void) | (() => void);
	onRename: (file: FileEntry) => void;
	onCopy: ((path: string) => void) | (() => void);
	onCut: ((path: string) => void) | (() => void);
	refreshDirectory: () => void;
	onPaste: () => void;
	onCreateFile: () => void;
	onCreateFolder: () => void;
	onPinUnpinFolder?: (path: string, action: 'pin' | 'unpin') => void;
	canPaste: boolean;
	showHidden: boolean;
	onToggleHidden: () => void;
	restoreFromTrash?: (path: string) => void;
	permanentlyDelete?: (path: string) => void;
	selectionCount?: number;
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
	refreshDirectory,
	canPaste,
	showHidden,
	onToggleHidden,
	restoreFromTrash,
	permanentlyDelete,
	selectionCount = 0
}: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [isMacOS, setIsMacOS] = useState(false);
	const isMultipleSelection = selectionCount > 1;

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
			className="fixed bg-stone-100/40 dark:bg-[#35302D]/70 backdrop-blur-lg shadow-lg rounded-md border-[0.5px] border-stone-200 dark:border-stone-400/50 dark:ring-1 dark:ring-black z-50 text-sm"
			style={{ minWidth: '180px' }}>
			<ul className="py-1">
				{location === ContextMenuLocation.FILE_LIST && file && (
					<>
						{restoreFromTrash ? (
							<>
								<li className="relative mx-1 pb-1.5">
									<div className="absolute bottom-0 left-1.5 right-1.5 h-px bg-stone-300 dark:bg-stone-400/40"></div>
									<button
										onClick={() => {
											restoreFromTrash(file.path);
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										Restore
									</button>
								</li>
								<li className="mx-1 pt-1">
									<button
										onClick={() => {
											permanentlyDelete?.(file.path);
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										Delete Permanently
									</button>
								</li>
							</>
						) : (
							<>
								<li className="relative mx-1 pb-1.5">
									<div className="absolute bottom-0 left-1.5 right-1.5 h-px bg-stone-300 dark:bg-stone-400/40"></div>
									<button
										onClick={() => {
											if (!isMultipleSelection) {
												onOpen(file);
											}
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										{endsWith(file.path, '.app') ? 'Open' : file.is_dir ? 'Open Folder' : 'Open'}
										<KeybindBadge>{isMacOS ? '⌘ O' : 'Ctrl+O'}</KeybindBadge>
									</button>
									{endsWith(file.path, '.app') && (
										<li>
											<button
												onClick={() => {
													if (!isMultipleSelection) {
														onOpen(file, true);
													}
													onClose();
												}}
												className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
												Show Package Contents <KeybindBadge>{isMacOS ? '⌘ ⇧ O' : 'Ctrl+⇧+O'}</KeybindBadge>
											</button>
										</li>
									)}
									{location !== ContextMenuLocation.SIDEBAR && canPaste && !restoreFromTrash && (
										<li>
											<button
												onClick={() => {
													onPaste();
													onClose();
												}}
												className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
												Paste Item <KeybindBadge>{isMacOS ? '⌘ V' : 'Ctrl+V'}</KeybindBadge>
											</button>
										</li>
									)}
								</li>
								<li className="relative mx-1 py-1.5">
									<div className="absolute bottom-0 left-1.5 right-1.5 h-px bg-stone-300 dark:bg-stone-400/40"></div>
									<button
										onClick={() => {
											if (isMultipleSelection) {
												onDelete();
											} else {
												onDelete(file.path);
											}
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										<span>Move to Trash</span>
										<KeybindBadge>
											{isMacOS ? (
												<span>
													⌘ <Delete className="inline -mt-0.5" size={13} />
												</span>
											) : (
												'Delete'
											)}
										</KeybindBadge>
									</button>
								</li>
								<li className="mx-1 pt-1.5">
									<button
										onClick={() => {
											if (isMultipleSelection) {
												onCopy();
											} else {
												onCopy(file.path);
											}
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										Copy <KeybindBadge>{isMacOS ? '⌘ C' : 'Ctrl+C'}</KeybindBadge>
									</button>
								</li>
								<li className="mx-1">
									<button
										onClick={() => {
											if (isMultipleSelection) {
												onCut();
											} else {
												onCut(file.path);
											}
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										Cut <KeybindBadge>{isMacOS ? '⌘ X' : 'Ctrl+X'}</KeybindBadge>
									</button>
								</li>
								<li className="mx-1 pb-1.5">
									<button
										onClick={() => {
											if (!isMultipleSelection) {
												onRename(file);
											}
											onClose();
										}}
										className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
										Rename <KeybindBadge>{isMacOS ? '⌘ R' : 'Ctrl+R'}</KeybindBadge>
									</button>
								</li>
							</>
						)}
					</>
				)}

				{location === ContextMenuLocation.SIDEBAR && file && onPinUnpinFolder && (
					<li className="mx-1 pb-[0.28rem]">
						<button
							onClick={() => {
								onPinUnpinFolder(file.path, 'unpin');
								onClose();
							}}
							className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
							Unpin from sidebar
						</button>
					</li>
				)}

				{(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE) && !restoreFromTrash && (
					<>
						<li className={file && location === ContextMenuLocation.FILE_LIST ? 'pt-1.5 mx-1 relative' : 'mx-1'}>
							{file && location === ContextMenuLocation.FILE_LIST && (
								<div className="absolute top-0 left-1.5 right-1.5 h-px bg-stone-300 dark:bg-stone-400/40"></div>
							)}
							<button
								onClick={() => {
									onCreateFile();
									onClose();
								}}
								className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
								New File <KeybindBadge>{isMacOS ? '⌘ N' : 'Ctrl+N'}</KeybindBadge>
							</button>
						</li>
						<li className="mx-1 mb-1.5">
							<button
								onClick={() => {
									onCreateFolder();
									onClose();
								}}
								className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
								New Folder <KeybindBadge>{isMacOS ? '⌘ ⇧ N' : 'Ctrl+⇧+N'}</KeybindBadge>
							</button>
						</li>
					</>
				)}

				{!restoreFromTrash && (
					<li
						className={
							(location === ContextMenuLocation.SIDEBAR && !file) ||
							(location !== ContextMenuLocation.SIDEBAR &&
								!canPaste &&
								!(location === ContextMenuLocation.FILE_LIST || location === ContextMenuLocation.EMPTY_SPACE))
								? ''
								: 'relative pt-1.5 mx-1'
						}>
						<div className="absolute top-0 left-1.5 right-1.5 h-px bg-stone-300 dark:bg-stone-400/40"></div>

						<button
							onClick={() => {
								onToggleHidden();
								onClose();
							}}
							className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
							{showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'} <KeybindBadge>{isMacOS ? '⌘ H' : 'Ctrl+H'}</KeybindBadge>
						</button>

						<li>
							<button
								onClick={() => {
									refreshDirectory();
									onClose();
								}}
								className="py-0.5 group w-full text-left px-2 rounded hover:text-white hover:bg-[#0070FF] dark:hover:bg-[#0070FF]/90 dark:text-stone-200 flex justify-between items-center">
								Refresh
							</button>
						</li>
					</li>
				)}
			</ul>
		</div>
	);
}
